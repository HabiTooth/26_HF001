package com.habitooth.backend.domain.llm.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.service.ScoreCalculator;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.llm.client.LlmReportClient;
import com.habitooth.backend.domain.llm.dto.LlmIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmPrevIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmReportPayload;
import com.habitooth.backend.domain.llm.dto.LlmReportRequestInput;
import com.habitooth.backend.domain.llm.dto.LlmReportResult;
import com.habitooth.backend.domain.llm.dto.LlmZoneInput;
import com.habitooth.backend.domain.llm.dto.response.LlmReportResponse;
import com.habitooth.backend.domain.llm.entity.LlmReport;
import com.habitooth.backend.domain.llm.entity.LlmReportLog;
import com.habitooth.backend.domain.llm.repository.LlmReportLogRepository;
import com.habitooth.backend.domain.llm.repository.LlmReportRepository;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import com.habitooth.backend.global.error.handler.LlmReportHandler;
import com.habitooth.backend.global.error.handler.ScanHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlmReportService {

    private final ScanSessionRepository scanSessionRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final ScanImageRepository scanImageRepository;
    private final LlmReportClient llmReportClient;
    private final LlmReportRepository llmReportRepository;
    private final LlmReportLogRepository llmReportLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public LlmReportResponse generateSessionLlmReport(Long userId, Long sessionId) {
        ScanSession session = scanSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));
        if (!session.getUserId().equals(userId)) {
            throw new AiAnalysisHandler(ErrorCode.FORBIDDEN);
        }

        List<AnalysisResult> latestResults = analysisResultRepository.findLatestSuccessBySessionId(sessionId);
        PrevSessionSnapshot prev = resolvePrevSession(session);

        LlmReportRequestInput input = LlmReportRequestInput.builder()
                .totalScore(sessionScoreOf(latestResults))
                .prevTotalScore(prev == null ? null : sessionScoreOf(prev.results()))
                .capturedZoneCount(capturedZoneCountOf(sessionId))
                .totalZoneCount(ViewType.values().length)
                .zones(toLlmZones(latestResults))
                .teeth(toLlmIssues(toothAreasOf(latestResults)))
                .prevZones(prev == null ? null : toLlmZones(prev.results()))
                .prevTeeth(prev == null ? null : toLlmPrevIssues(prev.toothAreas()))
                .build();

        // 실제 전송 본문 그대로 로그에 남긴다 (클라이언트가 같은 직렬화 경로를 쓴다).
        String requestJson = llmReportClient.toRequestJson(input);

        LlmReportResult result;
        try {
            result = llmReportClient.generateReport(input);
        } catch (RuntimeException e) {
            saveLog(sessionId, false, requestJson, null, e.getMessage());
            throw e;
        }

        saveLog(sessionId, true, requestJson, responseJsonOf(result), null);
        saveOrUpdateReport(sessionId, result);

        return toResponse(sessionId, result, parsePayload(result.getRawResultJson()));
    }

    /**
     * 저장된 LLM 리포트를 재생성 없이 조회한다. {@link #generateSessionLlmReport} 와 달리
     * EEVE 서버를 호출하지 않고 {@code llm_report} 테이블만 읽는다.
     */
    @Transactional(readOnly = true)
    public LlmReportResponse getSessionLlmReport(Long userId, Long sessionId) {
        ScanSession session = scanSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));
        if (!session.getUserId().equals(userId)) {
            throw new AiAnalysisHandler(ErrorCode.FORBIDDEN);
        }

        LlmReport llmReport = llmReportRepository.findByScanSessionId(sessionId)
                .orElseThrow(() -> new LlmReportHandler(ErrorCode.LLM_REPORT_NOT_FOUND));

        LlmReportResult result = LlmReportResult.builder()
                .riskDetail(fromJson(llmReport.getRiskDetailJson(), new TypeReference<List<LlmReportResult.RiskDetailItem>>() {}))
                .management(fromJson(llmReport.getManagementJson(), new TypeReference<List<LlmReportResult.ManagementItem>>() {}))
                .disclaimer(llmReport.getDisclaimer())
                .rawResultJson(llmReport.getReportJson())
                .build();

        return toResponse(sessionId, result, parsePayload(llmReport.getReportJson()));
    }

    /**
     * 직전 완료 세션의 분석 스냅샷.
     *
     * <p>{@code prevZones / prevTotalScore / prevTeeth} 가 같은 세션의 같은 결과 집합에서 나와야 해서
     * 한 번 조회한 걸 묶어 둔다. 예전에는 직전 세션을 {@code .map()} 으로 흘려보내 치아 병변만 뽑았다.
     */
    private record PrevSessionSnapshot(List<AnalysisResult> results, List<AnalysisToothArea> toothAreas) {
    }

    private PrevSessionSnapshot resolvePrevSession(ScanSession session) {
        return scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                        session.getUserId(), ScanSessionStatus.COMPLETED, session.getStartedAt())
                // 치아 단위 상태(정본)는 구역별 최신 SUCCESS 결과의 AnalysisToothArea 다.
                // AnalysisDetectedIssue.confidence 는 위험도로 쓰지 않는다.
                .map(prevSession -> analysisResultRepository.findLatestSuccessBySessionId(prevSession.getId()))
                .map(results -> new PrevSessionSnapshot(results, toothAreasOf(results)))
                .orElse(null);
    }

    /**
     * 세션 종합 점수. 리포트 화면(ReportService#getSessionZoneReport)·대시보드·히스토리와 같은
     * {@link ScoreCalculator} v2.3 산식이며, 정수 반올림 전 소수 1자리 값을 그대로 보낸다.
     * 유효 구역이 하나도 없으면 null.
     */
    private static Double sessionScoreOf(List<AnalysisResult> results) {
        return ScoreCalculator.sessionScore(ScoreCalculator.combineZoneScores(results));
    }

    /**
     * 이번 세션에서 촬영한 구역 수. ReportService#getSessionZoneReport 의 {@code capturedZoneCount} 와
     * 같은 기준(scan_image 기준) — 한 구역을 백색광·UV 로 찍어도 1로 센다. 분석 실패 구역도 포함된다.
     */
    private Integer capturedZoneCountOf(Long sessionId) {
        return (int) scanImageRepository.findAllByScanSessionId(sessionId).stream()
                .map(ScanImage::getViewType)
                .distinct()
                .count();
    }

    private List<AnalysisToothArea> toothAreasOf(List<AnalysisResult> results) {
        return results.stream()
                .flatMap(result -> result.getToothAreas().stream())
                .toList();
    }

    /**
     * 구역별 최신 SUCCESS 결과 → LLM 서버 zones 입력.
     *
     * <p>행(이미지) 1개당 1줄이라 한 구역을 두 광원으로 찍으면 같은 viewType 이 2줄 나간다. 합치지 않는 건
     * 의도적이다 — LLM 서버가 {@code lightType} 으로 치석 행과 치태 행을 구분해 감점을 분해한다.
     * {@code scanImage} 는 {@code findLatestSuccessBySessionId} 가 fetch join 으로 함께 로딩하므로
     * 여기서 접근해도 N+1 이 나지 않는다.
     */
    private List<LlmZoneInput> toLlmZones(List<AnalysisResult> results) {
        return results.stream()
                .map(r -> LlmZoneInput.builder()
                        .viewType(r.getViewType())
                        .lightType(r.getScanImage() == null ? null : r.getScanImage().getLightType())
                        .zoneScore(r.getZoneScore())
                        .zoneValid(r.getZoneValid())
                        .detectedToothCount(r.getDetectedToothCount())
                        .totalCalculusRatio(r.getTotalCalculusRatio())
                        .totalPlaqueRatio(r.getTotalPlaqueRatio())
                        .build())
                .toList();
    }

    /**
     * 세션 tooth area → LLM 서버 teeth 입력.
     *
     * <p>{@code areaRatio == 0} 행은 "검사했으나 병변 없음"을 뜻하는 정상 치아 기록이다.
     * 웹앱 치아 상태 표시·세션 간 비교에 필요해 DB에는 남기지만, LLM 리포트 payload에
     * 넣으면 EEVE 서버가 촬영만 된 치아까지 "치석/치태 관찰됨"으로 서술한다
     * (세션 127: 제목이 "치석 19개 / 치태 17개"로 부풀려짐). {@code areaRatio > 0} 인
     * 실제 병변만 전달한다. 웹앱 경로({@code ReportService#getSessionSimpleReport})도
     * 동일하게 자기 변환 지점에서 거른다.
     */
    private List<LlmIssueInput> toLlmIssues(List<AnalysisToothArea> toothAreas) {
        return toothAreas.stream()
                .filter(area -> area.getLesionType() != null)
                .filter(area -> area.getAreaRatio() != null && area.getAreaRatio() > 0.0)
                .map(area -> LlmIssueInput.builder()
                        .toothNumber(area.getToothNumber())
                        .lesionType(area.getLesionType())
                        .areaRatio(area.getAreaRatio())
                        .toothScore(area.getToothScore())
                        .riskLevel(area.getRiskLevel())
                        .build())
                .toList();
    }

    /**
     * 이전 세션 tooth area → LLM 서버 prevTeeth 입력(신규/유지/해소 판정용).
     *
     * <p>{@link #toLlmIssues} 와 같은 이유로 {@code areaRatio > 0} 인 병변만 넘긴다.
     * {@code areaRatio == 0} 행이 섞이면 병변이 없던 치아가 "이전에 병변 있었음"으로
     * 잡혀 PERSISTED/RESOLVED 판정이 틀어진다.
     *
     * <p>v2 부터 {@code areaRatio} 를 함께 보낸다 — 서버가 "유지되었지만 넓어졌다"까지 판정한다.
     */
    private List<LlmPrevIssueInput> toLlmPrevIssues(List<AnalysisToothArea> toothAreas) {
        return toothAreas.stream()
                .filter(area -> area.getToothNumber() != null && area.getLesionType() != null)
                .filter(area -> area.getAreaRatio() != null && area.getAreaRatio() > 0.0)
                .map(area -> LlmPrevIssueInput.builder()
                        .toothNumber(area.getToothNumber())
                        .lesionType(area.getLesionType())
                        .areaRatio(area.getAreaRatio())
                        .build())
                .toList();
    }

    private void saveOrUpdateReport(Long sessionId, LlmReportResult result) {
        LlmReport llmReport = llmReportRepository.findByScanSessionId(sessionId)
                .orElse(null);

        if (llmReport == null) {
            llmReportRepository.save(LlmReport.builder()
                    .scanSessionId(sessionId)
                    .riskDetailJson(toJson(result.getRiskDetail()))
                    .managementJson(toJson(result.getManagement()))
                    .disclaimer(result.getDisclaimer())
                    .reportJson(result.getRawResultJson())
                    .build());
            return;
        }

        llmReport.update(
                toJson(result.getRiskDetail()),
                toJson(result.getManagement()),
                result.getDisclaimer(),
                result.getRawResultJson()
        );
    }

    private void saveLog(Long sessionId, boolean success, String requestJson, String responseJson, String errorMessage) {
        llmReportLogRepository.save(LlmReportLog.builder()
                .scanSessionId(sessionId)
                .success(success)
                .requestJson(requestJson)
                .responseJson(responseJson)
                .errorMessage(errorMessage)
                .build());
    }

    /** 응답 로그도 변환 후가 아니라 서버가 보낸 result 원문을 남긴다. 원문이 없으면 변환 결과로 대체. */
    private String responseJsonOf(LlmReportResult result) {
        return result.getRawResultJson() != null ? result.getRawResultJson() : toJson(result);
    }

    /**
     * {@code report_json} → v2 확장 payload.
     *
     * <p>null(V23 이전 행)이면 null 을 돌려 v2 필드만 비운다. 역직렬화가 깨져도 예외를 던지지 않는다 —
     * 확장 필드 하나 때문에 기존 riskDetail/management 응답까지 막을 이유가 없다.
     */
    private LlmReportPayload parsePayload(String reportJson) {
        if (reportJson == null || reportJson.isBlank()) {
            return null;
        }

        try {
            return objectMapper.readValue(reportJson, LlmReportPayload.class);
        } catch (JsonProcessingException e) {
            log.warn("LLM 리포트 v2 payload 역직렬화 실패. 기존 필드만 응답한다.", e);
            return null;
        }
    }

    private LlmReportResponse toResponse(Long sessionId, LlmReportResult result, LlmReportPayload payload) {
        List<LlmReportResponse.RiskDetail> riskDetail = result.getRiskDetail().stream()
                .map(item -> LlmReportResponse.RiskDetail.builder()
                        .title(item.getTitle())
                        .detail(item.getDetail())
                        .riskLevel(item.getRiskLevel())
                        .build())
                .toList();

        List<LlmReportResponse.Management> management = result.getManagement().stream()
                .map(item -> LlmReportResponse.Management.builder()
                        .title(item.getTitle())
                        .detail(item.getDetail())
                        .build())
                .toList();

        return LlmReportResponse.builder()
                .sessionId(sessionId)
                .riskDetail(riskDetail)
                .management(management)
                .disclaimer(result.getDisclaimer())
                .score(payload == null ? null : payload.getScore())
                .interpretation(payload == null ? null : payload.getInterpretation())
                .interpretationSource(payload == null ? null : payload.getInterpretationSource())
                .actions(payload == null ? null : payload.getActions())
                .notice(payload == null ? null : payload.getNotice())
                .logicVersion(payload == null ? null : payload.getLogicVersion())
                .build();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("LLM 리포트 로그 직렬화 실패", e);
            return "{}";
        }
    }

    private <T> T fromJson(String json, TypeReference<T> typeReference) {
        try {
            return objectMapper.readValue(json, typeReference);
        } catch (JsonProcessingException e) {
            log.error("저장된 LLM 리포트 역직렬화 실패", e);
            throw new LlmReportHandler(ErrorCode.LLM_SERVER_RESPONSE_ERROR);
        }
    }
}
