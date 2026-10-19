package com.habitooth.backend.domain.ai.client;

import com.habitooth.backend.domain.ai.dto.fastapi.FastApiBaseResponse;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiCalculusCrossCheck;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiDetectedIssue;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiOverlay;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiFluorescenceToothStatus;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiPlaqueFluorescenceResponse;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiPlaqueRegion;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiPoint;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiQualityCheckResponse;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiQualityDetail;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiReportResponse;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiResultData;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiTaskInitResponse;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiTaskResult;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiTaskResultResponse;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiToothArea;
import com.habitooth.backend.domain.ai.dto.fastapi.FastApiToothStatus;
import com.habitooth.backend.domain.ai.dto.response.AiAnalyzeResponse;
import com.habitooth.backend.domain.ai.dto.response.CalculusCrossCheckResult;
import com.habitooth.backend.domain.ai.dto.response.CaptureQualityResponse;
import com.habitooth.backend.domain.ai.dto.response.DetectedIssueResult;
import com.habitooth.backend.domain.ai.dto.response.PolygonPoint;
import com.habitooth.backend.domain.ai.dto.response.ToothAreaResult;
import com.habitooth.backend.domain.ai.dto.response.ToothStatusResult;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.domain.ai.dto.response.OverlayImageResult;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Slf4j
@Component
public class FastApiAiAnalysisClient implements AiAnalysisClient {

    private final WebClient aiWebClient;

    /** report/generate 에 결과 오버레이 PNG 를 요청할지. 구버전 FastAPI 는 폼 필드를 무시하므로 켜 둬도 무해하다. */
    private final boolean includeOverlay;

    @Autowired
    public FastApiAiAnalysisClient(
            WebClient aiWebClient,
            @Value("${ai.server.include-overlay:true}") boolean includeOverlay
    ) {
        this.aiWebClient = aiWebClient;
        this.includeOverlay = includeOverlay;
    }

    /** 오버레이 요청을 켠 기본 구성. 테스트용. */
    public FastApiAiAnalysisClient(WebClient aiWebClient) {
        this(aiWebClient, true);
    }

    @Override
    public String initTask(String missingTeethCsv) {
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        if (missingTeethCsv != null && !missingTeethCsv.isBlank()) {
            body.add("missing_teeth", missingTeethCsv);
        }

        FastApiTaskInitResponse response = callFastApi(
                () -> aiWebClient.post()
                        .uri("/api/ai/task/init")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(body))
                        .retrieve()
                        .bodyToMono(FastApiTaskInitResponse.class)
                        .block(),
                ErrorCode.AI_TASK_INIT_FAILED
        );

        if (response.getTaskId() == null || response.getTaskId().isBlank()) {
            throw new AiAnalysisHandler(ErrorCode.AI_TASK_INIT_FAILED);
        }

        return response.getTaskId();
    }

    @Override
    public AiAnalyzeResponse analyzeWhite(
            String taskId,
            Long scanImageId,
            Resource imageResource,
            String filename,
            ViewType viewType,
            Long sessionId
    ) {
        // 1. 이미지 전처리
        preprocess(taskId, imageResource, filename, viewType);

        // 2. 치아 영역 및 FDI 번호 검출 (결손치는 task/init 에서 등록됨)
        predictToothArea(taskId);

        // 3. 치석 분석 — confidence threshold 적용과 치아별 areaRatio/toothScore/zoneScore
        //    계산은 FastAPI 가 단독으로 담당한다. Spring 은 다시 거르거나 재계산하지 않는다.
        predictCalculus(taskId);

        // 4. 점수 리포트 생성
        FastApiReportResponse reportResponse = generateReport(taskId, sessionId);

        // 5. polygon 등 시각화용 상세 결과 조회 (v12 는 기본 응답에서 polygon 을 뺀다).
        //    cleanup 은 하지 않는다 — 같은 zone 의 UV 분석이 이 task 의 치석 결과를 읽어야 한다.
        FastApiTaskResultResponse taskResultResponse = getTaskResult(taskId);

        // 6. Spring 내부 응답 DTO로 변환
        return convertToAnalyzeResponse(
                scanImageId,
                taskId,
                viewType,
                LightType.WHITE_LIGHT,
                taskResultResponse,
                reportResponse,
                null
        );
    }

    @Override
    public AiAnalyzeResponse analyzeUv(
            String taskId,
            Long scanImageId,
            Resource imageResource,
            String filename,
            ViewType viewType,
            Long sessionId,
            String calculusTaskId
    ) {
        preprocess(taskId, imageResource, filename, viewType);
        predictToothArea(taskId);

        // 3-B. UV 형광 치태 분석. report 가 UV 이미지 캐시를 비우므로 반드시 report 보다 먼저.
        //      calculusTaskId 를 주면 FastAPI 가 메모리의 백색광 치석 결과로 겹친 영역을 뺀다(§5.3).
        FastApiPlaqueFluorescenceResponse fluorescenceResponse =
                predictPlaqueFluorescence(taskId, calculusTaskId);

        FastApiReportResponse reportResponse = generateReport(taskId, sessionId);
        FastApiTaskResultResponse taskResultResponse = getTaskResult(taskId);

        return convertToAnalyzeResponse(
                scanImageId,
                taskId,
                viewType,
                LightType.UV_LIGHT,
                taskResultResponse,
                reportResponse,
                convertCrossCheck(fluorescenceResponse)
        );
    }

    @Override
    public void cleanupTask(String taskId) {
        if (taskId == null) {
            return;
        }

        try {
            FastApiTaskResultResponse response = callFastApi(
                    () -> aiWebClient.get()
                            .uri(uriBuilder -> uriBuilder
                                    .path("/api/ai/task/{taskId}/result")
                                    .queryParam("cleanup", true)
                                    .build(taskId))
                            .retrieve()
                            .bodyToMono(FastApiTaskResultResponse.class)
                            .block(),
                    ErrorCode.AI_RESULT_FETCH_FAILED
            );

            if (!Boolean.TRUE.equals(response.getIsSuccess())) {
                // report 전에 실패한 task 는 COMPLETED 가 아니라 FastAPI 가 지우지 않는다. 오류로 보지 않는다.
                log.info("[AI_CLEANUP] task 정리 생략. taskId={}, message={}", taskId, response.getMessage());
            }
        } catch (Exception e) {
            log.warn("[AI_CLEANUP] task 정리 호출 실패(무시). taskId={}", taskId, e);
        }
    }

    @Override
    public CaptureQualityResponse checkQuality(
            Resource imageResource,
            String filename,
            ViewType viewType,
            LightType lightType,
            String missingTeethCsv
    ) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", imageResource)
                .filename(filename)
                .contentType(MediaType.IMAGE_JPEG);
        builder.part("zone", viewType.name());

        if (missingTeethCsv != null && !missingTeethCsv.isBlank()) {
            builder.part("missing_teeth", missingTeethCsv);
        }

        String fastApiLightType = toFastApiLightType(lightType);
        if (fastApiLightType != null) {
            builder.part("light_type", fastApiLightType);
        }

        // 네트워크 단절/타임아웃/알 수 없는 응답은 전부 AI_QUALITY_CHECK_UNAVAILABLE 로
        // 수렴시킨다 — 호출부(AiAnalysisService)가 이 코드만 보고 fail-open 여부를 판단한다.
        FastApiQualityCheckResponse response = callFastApi(
                () -> aiWebClient.post()
                        .uri("/api/ai/capture/quality-check")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(builder.build()))
                        .retrieve()
                        .bodyToMono(FastApiQualityCheckResponse.class)
                        .block(),
                ErrorCode.AI_QUALITY_CHECK_UNAVAILABLE
        );

        // isSuccess=false 는 인프라 장애가 아니라 우리 쪽 요청 자체가 잘못됐다는 뜻
        // (예: 알 수 없는 zone). fail-open 대상이 아니라 그대로 에러로 전파한다.
        if (!Boolean.TRUE.equals(response.getIsSuccess())) {
            log.warn("품질 판정 요청이 FastAPI 에서 거부됨. zone={}, message={}", viewType, response.getMessage());
            throw new AiAnalysisHandler(ErrorCode.AI_QUALITY_CHECK_INVALID_REQUEST);
        }

        return convertToCaptureQualityResponse(response);
    }

    private String toFastApiLightType(LightType lightType) {
        if (lightType == null) {
            return null;
        }
        return switch (lightType) {
            case WHITE_LIGHT -> "WHITE";
            case UV_LIGHT -> "UV";
        };
    }

    private CaptureQualityResponse convertToCaptureQualityResponse(FastApiQualityCheckResponse response) {
        CaptureQualityResponse.CaptureQualityResponseBuilder builder = CaptureQualityResponse.builder()
                .needsRetake(Boolean.TRUE.equals(response.getNeedsRetake()))
                .reason(response.getReason())
                .message(response.getMessage());

        FastApiQualityDetail detail = response.getDetail();
        if (detail != null) {
            builder.detail(CaptureQualityResponse.QualityDetail.builder()
                    .blurScore(detail.getBlurScore())
                    .blurThreshold(detail.getBlurThreshold())
                    .lightType(detail.getLightType())
                    .detectedCount(detail.getDetectedCount())
                    .expectedCount(detail.getExpectedCount())
                    .meanConfidence(detail.getMeanConfidence())
                    .minConfidence(detail.getMinConfidence())
                    .coverageRatio(detail.getCoverageRatio())
                    .borderTouchingCount(detail.getBorderTouchingCount())
                    .build());
        }

        return builder.build();
    }

    private void preprocess(
            String taskId,
            Resource imageResource,
            String filename,
            ViewType viewType
    ) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("task_id", taskId);
        builder.part("file", imageResource)
                .filename(filename)
                .contentType(MediaType.IMAGE_JPEG);

        if (viewType != null) {
            builder.part("zone", viewType.name());
        }

        FastApiBaseResponse response = callFastApi(
                () -> aiWebClient.post()
                        .uri("/api/ai/preprocess")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(builder.build()))
                        .retrieve()
                        .bodyToMono(FastApiBaseResponse.class)
                        .block(),
                ErrorCode.AI_PREPROCESS_FAILED
        );

        validateSuccess(response, ErrorCode.AI_PREPROCESS_FAILED);
    }

    private void predictToothArea(String taskId) {
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("task_id", taskId);

        FastApiBaseResponse response = callFastApi(
                () -> aiWebClient.post()
                        .uri("/api/ai/predict/tooth-area")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(body))
                        .retrieve()
                        .bodyToMono(FastApiBaseResponse.class)
                        .block(),
                ErrorCode.AI_TOOTH_AREA_FAILED
        );

        validateSuccess(response, ErrorCode.AI_TOOTH_AREA_FAILED);
    }

    private void predictCalculus(String taskId) {
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("task_id", taskId);
        body.add("mode", "CALCULUS");

        FastApiBaseResponse response = callFastApi(
                () -> aiWebClient.post()
                        .uri("/api/ai/predict/calculus")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(body))
                        .retrieve()
                        .bodyToMono(FastApiBaseResponse.class)
                        .block(),
                ErrorCode.AI_CALCULUS_FAILED
        );

        validateSuccess(response, ErrorCode.AI_CALCULUS_FAILED);
    }

    /**
     * UV 형광 기반 치태 분석
     */
    private FastApiPlaqueFluorescenceResponse predictPlaqueFluorescence(String taskId, String calculusTaskId) {
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("task_id", taskId);
        if (calculusTaskId != null) {
            body.add("calculus_task_id", calculusTaskId);
        }

        FastApiPlaqueFluorescenceResponse response = callFastApi(
                () -> aiWebClient.post()
                        .uri("/api/ai/predict/plaque-fluorescence")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(body))
                        .retrieve()
                        .bodyToMono(FastApiPlaqueFluorescenceResponse.class)
                        .block(),
                ErrorCode.AI_PLAQUE_FAILED
        );

        if (!Boolean.TRUE.equals(response.getIsSuccess())) {
            log.warn("UV 형광 치태 분석 실패. taskId={}, message={}", taskId, response.getMessage());
            throw new AiAnalysisHandler(ErrorCode.AI_PLAQUE_FAILED);
        }

        FastApiCalculusCrossCheck crossCheck = response.getCalculusCrossCheck();
        if (crossCheck != null && !Boolean.TRUE.equals(crossCheck.getApplied())) {
            log.warn("[AI_UV] 치석 2차 검증 미적용. taskId={}, calculusTaskId={}, reason={}",
                    taskId, calculusTaskId, crossCheck.getReason());
        }

        return response;
    }

    private FastApiReportResponse generateReport(String taskId, Long sessionId) {
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("task_id", taskId);
        if (sessionId != null) {
            body.add("session_id", String.valueOf(sessionId));
        }
        if (includeOverlay) {
            // 사용자용 오버레이: 범례 패널 없이 병변만 그린 PNG(base64)가 result.overlayImage 로 온다.
            body.add("include_overlay", "true");
        }

        FastApiReportResponse response = callFastApi(
                () -> aiWebClient.post()
                        .uri("/api/ai/report/generate")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(body))
                        .retrieve()
                        .bodyToMono(FastApiReportResponse.class)
                        .block(),
                ErrorCode.AI_REPORT_FAILED
        );
        
        // report 만 isSuccess 가 아니라 success + code(AI200/AI400/AI404) 로 응답한다.
        if (!Boolean.TRUE.equals(response.getSuccess())) {
            log.warn("AI 리포트 생성 실패. taskId={}, code={}, message={}",
                    taskId, response.getCode(), response.getMessage());
            throw new AiAnalysisHandler(ErrorCode.AI_REPORT_FAILED);
        }

        if (response.getResult() == null) {
            throw new AiAnalysisHandler(ErrorCode.AI_REPORT_RESULT_EMPTY);
        }

        if (response.getResult().getDemoOutputDir() != null) {
            log.info("[AI_DEMO] taskId={} sessionId={} demoOutputDir={}",
                    taskId, sessionId, response.getResult().getDemoOutputDir());
        }

        return response;
    }

    private FastApiTaskResultResponse getTaskResult(String taskId) {
        FastApiTaskResultResponse response = callFastApi(
                () -> aiWebClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/api/ai/task/{taskId}/result")
                                .queryParam("include_geometry", true)
                                .build(taskId))
                        .retrieve()
                        .bodyToMono(FastApiTaskResultResponse.class)
                        .block(),
                ErrorCode.AI_RESULT_FETCH_FAILED
        );

        if (!Boolean.TRUE.equals(response.getIsSuccess())) {
            throw new AiAnalysisHandler(ErrorCode.AI_RESULT_FETCH_FAILED);
        }

        if (response.getResult() == null) {
            throw new AiAnalysisHandler(ErrorCode.AI_REPORT_RESULT_EMPTY);
        }

        return response;
    }

    private AiAnalyzeResponse convertToAnalyzeResponse(
            Long scanImageId,
            String taskId,
            ViewType requestViewType,
            LightType lightType,
            FastApiTaskResultResponse taskResultResponse,
            FastApiReportResponse reportResponse,
            CalculusCrossCheckResult calculusCrossCheck
    ) {
        FastApiTaskResult taskResult = taskResultResponse.getResult();
        FastApiResultData reportResult = reportResponse.getResult();

        if (taskResult.getToothArea() == null || taskResult.getToothArea().isEmpty()) {
            throw new AiAnalysisHandler(ErrorCode.AI_TOOTH_AREA_EMPTY);
        }


        List<ToothAreaResult> teeth = taskResult.getToothArea().stream()
                .map(this::convertToothArea)
                .toList();

        // analyze() 에서 광원별로 한쪽 파이프라인만 태우므로, 결과를 읽는 쪽도 같은
        // 기준으로 갈라야 한다. UV 이미지의 치아 상태/병변 위치는 모델 기반
        // toothStatuses·detectedIssues 가 아니라 fluorescenceToothStatuses 에 들어있다.
        boolean fluorescenceMode = lightType == LightType.UV_LIGHT;

        List<FastApiFluorescenceToothStatus> fluorescenceStatuses =
                !fluorescenceMode || reportResult.getFluorescenceToothStatuses() == null
                        ? List.of()
                        : reportResult.getFluorescenceToothStatuses();

        List<DetectedIssueResult> issues;
        List<ToothStatusResult> toothStatuses;

        if (fluorescenceMode) {
            issues = convertPlaqueRegions(fluorescenceStatuses);
            toothStatuses = convertFluorescenceToothStatuses(fluorescenceStatuses);
        } else {
            issues = taskResult.getDetectedIssues() == null
                    ? List.of()
                    : taskResult.getDetectedIssues().stream()
                            .map(this::convertDetectedIssue)
                            .toList();

            toothStatuses = reportResult.getToothStatuses() == null
                    ? List.of()
                    : reportResult.getToothStatuses().stream()
                            .map(this::convertToothStatus)
                            .toList();
        }

        // 2.3 부터 UV 구역 점수도 FastAPI 가 계산한다(fluorescenceZoneScore). 그 전 버전은 필드가 없으므로
        // 점수 필드를 비워 Spring(ScoreCalculator)이 계산하게 둔다. 판별 기준은 fluorescenceZoneValid 의 존재.
        boolean uvScoredByFastApi = fluorescenceMode && reportResult.getFluorescenceZoneValid() != null;
        Double zoneScore;
        Boolean zoneValid;
        String scoreVersion;
        if (!fluorescenceMode) {
            zoneScore = reportResult.getZoneScore();
            zoneValid = Boolean.TRUE.equals(reportResult.getZoneValid());
            scoreVersion = reportResult.getScoreVersion();
        } else if (uvScoredByFastApi) {
            zoneScore = reportResult.getFluorescenceZoneScore();
            zoneValid = Boolean.TRUE.equals(reportResult.getFluorescenceZoneValid());
            scoreVersion = reportResult.getScoreVersion();
        } else {
            zoneScore = null;
            zoneValid = null;
            scoreVersion = null;
        }

        Double totalCalculusRatio = 0.0;
        Double totalPlaqueRatio = 0.0;

        if (reportResult.getSummary() != null) {
            if (reportResult.getSummary().getTotalCalculusRatio() != null) {
                totalCalculusRatio =
                        reportResult.getSummary().getTotalCalculusRatio();
            }
            // 형광 치태 비율은 모델 기반 totalPlaqueRatio 와 산출 방식이 다른 별도 필드지만,
            // 저장/점수/리포트는 "치태 비율" 하나만 다루므로 여기서 같은 자리에 싣는다.
            // (한 이미지에 두 값이 동시에 채워지는 경우는 없다)
            Double plaqueRatio = fluorescenceMode
                    ? reportResult.getSummary().getTotalFluorescencePlaqueRatio()
                    : reportResult.getSummary().getTotalPlaqueRatio();
            if (plaqueRatio != null) {
                totalPlaqueRatio = plaqueRatio;
            }
        }

        // 검출 치아 수: 2.3 은 UV 에도 report.detectedToothCount 를 채워 준다(구버전 UV 는 0 으로 와서 못 쓴다).
        // 폴백은 DETECTED 상태 치아 수, 그것도 없으면 폴리곤 세그멘테이션 개수.
        boolean reportCountUsable = reportResult.getDetectedToothCount() != null
                && (!fluorescenceMode || uvScoredByFastApi);
        long detectedStatusCount = toothStatuses.stream()
                .filter(t -> t.getStatus() == null || t.getStatus() == ToothDetectionStatus.DETECTED)
                .count();
        Integer detectedToothCount = reportCountUsable
                ? reportResult.getDetectedToothCount()
                : (toothStatuses.isEmpty() ? teeth.size() : (int) detectedStatusCount);

        return AiAnalyzeResponse.builder()
                .scanImageId(scanImageId)
                .taskId(taskId)
                .viewType(requestViewType)
                .status("COMPLETED")
                .teeth(teeth)
                .issues(issues)
                .zoneScore(zoneScore)
                .zoneValid(zoneValid)
                .scoreVersion(scoreVersion)
                .detectedToothCount(detectedToothCount)
                .expectedToothCount(reportResult.getExpectedToothCount())
                .coverageRatio(reportResult.getCoverageRatio())
                .calculusCrossCheck(calculusCrossCheck)
                .overlay(convertOverlay(reportResult))

                // 치아 단위 원시 상태
                .toothStatuses(toothStatuses)

                // 병변 타입별 요약 비율
                .totalCalculusRatio(totalCalculusRatio)
                .totalPlaqueRatio(totalPlaqueRatio)
                .build();
    }

    /**
     * plaque-fluorescence 응답 → 치석 2차 검증 진단 정보.
     * 치아별 calculusExcludedPixels 도 함께 담아 analysis_result.calculus_cross_check_json 에 저장한다.
     */
    private CalculusCrossCheckResult convertCrossCheck(FastApiPlaqueFluorescenceResponse response) {
        FastApiCalculusCrossCheck crossCheck = response.getCalculusCrossCheck();
        List<FastApiFluorescenceToothStatus> statuses =
                response.getToothStatuses() == null ? List.of() : response.getToothStatuses();

        if (crossCheck == null && statuses.isEmpty()) {
            return null;
        }

        List<CalculusCrossCheckResult.ToothExclusion> teeth = statuses.stream()
                .map(status -> CalculusCrossCheckResult.ToothExclusion.builder()
                        .areaId(status.getAreaId())
                        .toothNumber(status.getToothNumber())
                        .calculusExcludedPixels(status.getCalculusExcludedPixels())
                        .build())
                .toList();

        return CalculusCrossCheckResult.builder()
                .applied(crossCheck != null && Boolean.TRUE.equals(crossCheck.getApplied()))
                .sourceTaskId(crossCheck == null ? null : crossCheck.getSourceTaskId())
                .matchedTeeth(crossCheck == null || crossCheck.getMatchedTeeth() == null
                        ? List.of() : crossCheck.getMatchedTeeth())
                .unmatchedTeeth(crossCheck == null || crossCheck.getUnmatchedTeeth() == null
                        ? List.of() : crossCheck.getUnmatchedTeeth())
                .reason(crossCheck == null ? "calculusCrossCheck 응답 없음" : crossCheck.getReason())
                .calculusPixels(crossCheck == null ? null : crossCheck.getCalculusPixels())
                .teeth(teeth)
                .build();
    }

    /**
     * 오버레이는 보조 산출물이라 디코딩에 실패해도 분석을 실패시키지 않고 null 로 둔다.
     */
    private OverlayImageResult convertOverlay(FastApiResultData reportResult) {
        FastApiOverlay overlay = reportResult.getOverlay();
        String encoded = overlay == null ? null : overlay.getImage();
        if (encoded == null || encoded.isBlank()) {
            return null;
        }

        String payload = encoded.trim();
        int comma = payload.indexOf(',');
        if (payload.startsWith("data:") && comma > 0) {
            payload = payload.substring(comma + 1);
        }

        try {
            return OverlayImageResult.builder()
                    .png(Base64.getDecoder().decode(payload))
                    .width(overlay.getWidth())
                    .height(overlay.getHeight())
                    .build();
        } catch (IllegalArgumentException e) {
            log.warn("[AI_OVERLAY] overlayImage base64 디코딩 실패 → 오버레이 없이 진행. length={}", encoded.length(), e);
            return null;
        }
    }

    private ToothAreaResult convertToothArea(FastApiToothArea area) {
        Integer toothNumber = area.getToothNumber();

        return ToothAreaResult.builder()
                .areaId(area.getAreaId())
                .toothNumber(toothNumber)
                .templateRegionId(convertTemplateRegionId(toothNumber))
                .polygon(convertPoints(area.getPolygon()))
                .build();
    }

    private DetectedIssueResult convertDetectedIssue(FastApiDetectedIssue issue) {
        return DetectedIssueResult.builder()
                .toothNumber(issue.getToothNumber())
                .templateRegionId(convertTemplateRegionId(issue.getToothNumber()))
                .lesionType(convertLesionType(issue.getIssueType()))
                .confidence(issue.getConfidence())
                .polygon(convertPoints(issue.getPolygon()))
                .build();
    }

    /**
     * 백색광(모델 기반) 치아 상태 1건 변환.
     *
     * <p>2.3 부터 기대 치아 전부가 오고 미검출 치아는 {@code status=NOT_DETECTED}, {@code riskLevel="UNKNOWN"},
     * {@code areaRatio=null} 이다. 예전엔 riskLevel 을 무조건 enum 으로 바꾸다 UNKNOWN 에서 예외가 나
     * 기대 치아 하나만 안 잡혀도 구역 분석이 통째로 실패했다. 검출된 치아만 엄격히 변환하고,
     * 나머지는 상태만 남긴 채 점수 필드를 비운다(채점·집계는 DETECTED 만 센다).
     */
    private ToothStatusResult convertToothStatus(FastApiToothStatus status) {
        ToothDetectionStatus detection =
                convertDetectionStatus(status.getStatus(), status.getAreaRatio() != null);
        boolean detected = detection == ToothDetectionStatus.DETECTED;

        return ToothStatusResult.builder()
                .toothNumber(status.getToothNumber())
                .templateRegionId(convertTemplateRegionId(status.getToothNumber()))
                .status(detection)
                .lesionType(convertLesionType(status.getLesionType()))
                .areaRatio(detected ? status.getAreaRatio() : null)
                .toothScore(detected ? status.getToothScore() : null)
                .riskLevel(detected ? convertRiskLevel(status.getRiskLevel()) : null)
                .build();
    }

    /**
     * UV 형광 치아별 결과 → 치아 단위 상태.
     *
     * <p>치석 결과와 같은 자리에 실어 보내야 점수 계산({@code ScoreCalculator})과
     * AnalysisToothArea 저장이 광원과 무관하게 그대로 동작한다.
     *
     * <p>2.3 은 기대 치아 전부를 status(DETECTED/NOT_DETECTED/SKIPPED)와 함께 주고 toothScore/riskLevel 도
     * 계산해 준다. 구버전은 status 가 없어 {@code skipped} 로 SKIPPED 를 판정하고 점수는 Spring 이 낸다.
     * SKIPPED(치아 픽셀 부족)·NOT_DETECTED 행은 상태만 남기고 점수 필드를 비운다 — 채점에 넣으면
     * "치태 0% 인 건강한 치아"로 오인돼 구역 점수가 부풀려진다.
     */
    private List<ToothStatusResult> convertFluorescenceToothStatuses(
            List<FastApiFluorescenceToothStatus> statuses
    ) {
        return statuses.stream()
                .filter(status -> status.getToothNumber() != null)
                .map(status -> {
                    ToothDetectionStatus detection = fluorescenceDetectionStatus(status);
                    boolean detected = detection == ToothDetectionStatus.DETECTED;
                    double areaRatio = status.getPlaqueRatio() == null
                            ? 0.0
                            : status.getPlaqueRatio();
                    RiskLevel riskLevel = null;
                    if (detected) {
                        riskLevel = status.getRiskLevel() != null && !status.getRiskLevel().isBlank()
                                ? convertRiskLevel(status.getRiskLevel())
                                : riskLevelOf(areaRatio);
                    }
                    return ToothStatusResult.builder()
                            .toothNumber(status.getToothNumber())
                            .templateRegionId(convertTemplateRegionId(status.getToothNumber()))
                            .status(detection)
                            .lesionType(LesionType.PLAQUE)
                            .areaRatio(detected ? areaRatio : null)
                            .toothScore(detected ? status.getToothScore() : null)
                            .riskLevel(riskLevel)
                            .build();
                })
                .toList();
    }

    /** 2.3 status 문자열 우선, 없으면(구버전) skipped 플래그로 판정. */
    private ToothDetectionStatus fluorescenceDetectionStatus(FastApiFluorescenceToothStatus status) {
        if (status.getStatus() != null && !status.getStatus().isBlank()) {
            return convertDetectionStatus(status.getStatus(), !Boolean.TRUE.equals(status.getSkipped()));
        }
        return Boolean.TRUE.equals(status.getSkipped())
                ? ToothDetectionStatus.SKIPPED
                : ToothDetectionStatus.DETECTED;
    }

    /**
     * status 문자열 → enum. 구버전(null)은 전부 검출된 치아였으므로 DETECTED.
     * 모르는 값이 오면 실패시키지 않고 {@code hasMeasurement} 로 보수적으로 판정한다.
     */
    private ToothDetectionStatus convertDetectionStatus(String status, boolean hasMeasurement) {
        if (status == null || status.isBlank()) {
            return hasMeasurement ? ToothDetectionStatus.DETECTED : ToothDetectionStatus.NOT_DETECTED;
        }
        try {
            return ToothDetectionStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            log.warn("FastAPI가 알 수 없는 tooth status 를 반환했습니다. status={} → 측정값 유무로 판정", status);
            return hasMeasurement ? ToothDetectionStatus.DETECTED : ToothDetectionStatus.NOT_DETECTED;
        }
    }

    /**
     * UV 형광 치태 영역(contour) → 병변 목록.
     * 색 기반 판정이라 모델 confidence 가 없으므로 confidence 는 null 로 둔다.
     */
    private List<DetectedIssueResult> convertPlaqueRegions(
            List<FastApiFluorescenceToothStatus> statuses
    ) {
        return statuses.stream()
                .filter(status -> status.getToothNumber() != null)
                .filter(status -> status.getPlaqueRegions() != null)
                .flatMap(status -> status.getPlaqueRegions().stream()
                        .map(region -> convertPlaqueRegion(status.getToothNumber(), region)))
                .toList();
    }

    private DetectedIssueResult convertPlaqueRegion(Integer toothNumber, FastApiPlaqueRegion region) {
        return DetectedIssueResult.builder()
                .toothNumber(toothNumber)
                .templateRegionId(convertTemplateRegionId(toothNumber))
                .lesionType(LesionType.PLAQUE)
                .polygon(convertPoints(region.getPolygon()))
                .build();
    }

    /**
     * areaRatio(%) → 위험 단계.
     *
     * <p>모델 기반 결과는 FastAPI 가 riskLevel 을 내려주지만 형광 치태 결과에는 없어서
     * Spring 이 판정한다. 임계값은 FastAPI 의 {@code RISK_*_THRESHOLD} 와 동일하게 맞췄으니
     * 한쪽을 바꾸면 반드시 다른 쪽도 함께 바꿀 것.
     */
    private RiskLevel riskLevelOf(double areaRatio) {
        if (areaRatio >= 20.0) {
            return RiskLevel.CRITICAL;
        }
        if (areaRatio >= 10.0) {
            return RiskLevel.HIGH;
        }
        if (areaRatio >= 5.0) {
            return RiskLevel.MEDIUM;
        }
        if (areaRatio >= 2.0) {
            return RiskLevel.LOW;
        }
        return RiskLevel.VERY_LOW;
    }

    private List<PolygonPoint> convertPoints(List<FastApiPoint> points) {
        if (points == null) {
            return List.of();
        }

        return points.stream()
                .map(point -> PolygonPoint.builder()
                        .x(point.getX())
                        .y(point.getY())
                        .build())
                .toList();
    }

    private LesionType convertLesionType(String lesionType) {
        if (lesionType == null || lesionType.isBlank()) {
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }

        try {
            return LesionType.valueOf(lesionType.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            log.error("FastAPI가 알 수 없는 lesionType을 반환했습니다. lesionType={}", lesionType);
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }
    }

    private RiskLevel convertRiskLevel(String riskLevel) {
        if (riskLevel == null || riskLevel.isBlank()) {
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }

        try {
            return RiskLevel.valueOf(riskLevel.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            log.error("FastAPI가 알 수 없는 riskLevel을 반환했습니다. riskLevel={}", riskLevel);
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }
    }

    private String convertTemplateRegionId(Integer toothNumber) {
        return toothNumber == null ? null : "tooth_" + toothNumber;
    }

    private void validateSuccess(FastApiBaseResponse response, ErrorCode errorCode) {
        if (response == null || !Boolean.TRUE.equals(response.getIsSuccess())) {
            throw new AiAnalysisHandler(errorCode);
        }
    }

    private <T> T callFastApi(
            Supplier<T> supplier,
            ErrorCode errorCode
    ) {
        try {
            T response = supplier.get();

            if (response == null) {
                throw new AiAnalysisHandler(errorCode);
            }

            return response;

        } catch (AiAnalysisHandler e) {
            throw e;

        } catch (WebClientRequestException e) {
            log.error("FastAPI 서버 연결 실패", e);
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_UNAVAILABLE);

        } catch (WebClientResponseException e) {
            log.error(
                    "FastAPI 응답 오류. status={}, body={}",
                    e.getStatusCode(),
                    e.getResponseBodyAsString(),
                    e
            );
            throw new AiAnalysisHandler(errorCode);

        } catch (Exception e) {
            log.error("FastAPI 서버 응답 처리 중 오류", e);
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }
    }
}