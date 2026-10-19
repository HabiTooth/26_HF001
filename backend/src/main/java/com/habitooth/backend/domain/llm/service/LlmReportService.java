package com.habitooth.backend.domain.llm.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.llm.client.LlmReportClient;
import com.habitooth.backend.domain.llm.dto.LlmIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmPrevIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmReportResult;
import com.habitooth.backend.domain.llm.dto.LlmZoneInput;
import com.habitooth.backend.domain.llm.dto.response.LlmReportResponse;
import com.habitooth.backend.domain.llm.entity.LlmReport;
import com.habitooth.backend.domain.llm.entity.LlmReportLog;
import com.habitooth.backend.domain.llm.repository.LlmReportLogRepository;
import com.habitooth.backend.domain.llm.repository.LlmReportRepository;
import com.habitooth.backend.domain.scan.entity.ScanSession;
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
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlmReportService {

    private final ScanSessionRepository scanSessionRepository;
    private final AnalysisResultRepository analysisResultRepository;
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
        List<LlmZoneInput> zones = toLlmZones(latestResults);
        List<LlmIssueInput> teeth = toLlmIssues(toothAreasOf(latestResults));
        List<LlmPrevIssueInput> prevTeeth = resolvePrevIssues(session);

        String requestJson = toJson(Map.of(
                "zones", zones,
                "teeth", teeth,
                "prevTeeth", prevTeeth == null ? List.of() : prevTeeth
        ));

        LlmReportResult result;
        try {
            result = llmReportClient.generateReport(zones, teeth, prevTeeth);
        } catch (RuntimeException e) {
            saveLog(sessionId, false, requestJson, null, e.getMessage());
            throw e;
        }

        saveLog(sessionId, true, requestJson, toJson(result), null);
        saveOrUpdateReport(sessionId, result);

        return toResponse(sessionId, result);
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
                .build();

        return toResponse(sessionId, result);
    }

    private List<LlmPrevIssueInput> resolvePrevIssues(ScanSession session) {
        return scanSessionRepository.findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                        session.getUserId(), ScanSessionStatus.COMPLETED, session.getStartedAt())
                .map(prevSession -> toLlmPrevIssues(latestToothAreas(prevSession.getId())))
                .orElse(null);
    }

    /**
     * 세션의 치아 단위 상태(정본). 재분석이 쌓여도 구역별 최신 SUCCESS 결과의
     * AnalysisToothArea 만 사용한다. AnalysisDetectedIssue.confidence 는 위험도로 쓰지 않는다.
     */
    private List<AnalysisToothArea> latestToothAreas(Long sessionId) {
        return toothAreasOf(analysisResultRepository.findLatestSuccessBySessionId(sessionId));
    }

    private List<AnalysisToothArea> toothAreasOf(List<AnalysisResult> results) {
        return results.stream()
                .flatMap(result -> result.getToothAreas().stream())
                .toList();
    }

    /** 구역별 최신 SUCCESS 결과 → LLM 서버 zones 입력. */
    private List<LlmZoneInput> toLlmZones(List<AnalysisResult> results) {
        return results.stream()
                .map(r -> LlmZoneInput.builder()
                        .viewType(r.getViewType())
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
     */
    private List<LlmPrevIssueInput> toLlmPrevIssues(List<AnalysisToothArea> toothAreas) {
        return toothAreas.stream()
                .filter(area -> area.getToothNumber() != null && area.getLesionType() != null)
                .filter(area -> area.getAreaRatio() != null && area.getAreaRatio() > 0.0)
                .map(area -> LlmPrevIssueInput.builder()
                        .toothNumber(area.getToothNumber())
                        .lesionType(area.getLesionType())
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
                    .build());
            return;
        }

        llmReport.update(toJson(result.getRiskDetail()), toJson(result.getManagement()), result.getDisclaimer());
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

    private LlmReportResponse toResponse(Long sessionId, LlmReportResult result) {
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
