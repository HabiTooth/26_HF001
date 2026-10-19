package com.habitooth.backend.domain.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.ai.client.FastApiAiAnalysisClient;
import com.habitooth.backend.domain.ai.converter.AiAnalysisConverter;
import com.habitooth.backend.domain.ai.dto.request.AiAnalyzeRequest;
import com.habitooth.backend.domain.ai.dto.response.*;
import com.habitooth.backend.domain.ai.event.SessionAnalyzedEvent;
import com.habitooth.backend.domain.ai.entity.AnalysisDetectedIssue;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisDetectedIssueRepository;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.repository.AnalysisToothAreaRepository;
import com.habitooth.backend.domain.ai.type.AnalysisStatus;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.scan.service.ScanImageService;
import com.habitooth.backend.domain.scan.storage.ImageStorage;
import com.habitooth.backend.domain.user.entity.UserMissingTooth;
import com.habitooth.backend.domain.user.repository.UserMissingToothRepository;
import com.habitooth.backend.domain.user.repository.UserRepository;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import com.habitooth.backend.global.error.handler.ScanHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAnalysisService {

    private final FastApiAiAnalysisClient aiAnalysisClient;
    private final ScanImageService scanImageService;
    private final ScanSessionRepository scanSessionRepository;
    private final ScanImageRepository scanImageRepository;
    private final AnalysisResultService analysisResultService;
    private final ObjectMapper objectMapper;
    private final AnalysisDetectedIssueRepository analysisDetectedIssueRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final AnalysisToothAreaRepository analysisToothAreaRepository;
    private final UserRepository userRepository;
    private final UserMissingToothRepository userMissingToothRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ImageStorage imageStorage;

    // UV(형광 치태) 이미지의 치아/구역 점수 산식 버전. 백색광은 FastAPI 가 준 scoreVersion 을 저장한다.
    private static final String SCORE_VERSION = ScoreCalculator.SCORE_VERSION;

    /**
     * FastAPI 전처리(PP_MAX_SIDE)는 긴 변이 이 값보다 크면 축소한 뒤 추론하므로 응답 polygon 도
     * 축소된 좌표계다. 정규화 분모를 같은 크기로 맞추기 위해 미러링한다(긴 변이 이하면 배율 1).
     * ⚠️ main_v12.py 의 PP_MAX_SIDE 를 바꾸면 여기도 함께 바꿀 것 (0 이면 축소 없음).
     */
    static final int FASTAPI_PREPROCESS_MAX_SIDE = 1600;

    /**
     * 단건 분석. 짝이 되는 백색광 task 를 알 수 없으므로 UV 는 calculus_task_id 없이 분석한다
     * (FastAPI 가 치석 제외를 건너뛰고 calculusCrossCheck.applied=false 로 응답).
     * 백색광/UV 짝 분석이 필요하면 세션 분석({@link #analyzeSession})을 쓸 것.
     */
    public AiAnalyzeResponse analyzeSingleImage(Long userId, AiAnalyzeRequest request) {
        Long scanImageId = request.getScanImageId();
        String taskId = null;

        try {
            Resource imageResource = scanImageService.getImageResource(userId, scanImageId);
            String filename = scanImageService.getImageFilename(userId, scanImageId);
            ScanImage scanImage = scanImageService.getScanImage(userId, scanImageId);
            Long sessionId = scanImage.getScanSession() != null ? scanImage.getScanSession().getId() : null;

            log.info("Calling AI client for scanImageId={}, viewType={}, lightType={}",
                    scanImageId, request.getViewType(), request.getLightType());

            taskId = aiAnalysisClient.initTask(getMissingTeethCsv(userId));

            AiAnalyzeResponse response = request.getLightType() == LightType.UV_LIGHT
                    ? aiAnalysisClient.analyzeUv(taskId, scanImageId, imageResource, filename,
                            request.getViewType(), sessionId, null)
                    : aiAnalysisClient.analyzeWhite(taskId, scanImageId, imageResource, filename,
                            request.getViewType(), sessionId);

            toToothLocalPolygons(response, imageWidthOf(scanImage), imageHeightOf(scanImage));

            // 저장된 엔티티를 정본으로 삼아 응답 DTO 의 구역 점수 필드를 되채운다
            // (백색광 = FastAPI 값, UV = Spring 이 형광 치태 비율로 계산한 값).
            AnalysisResult saved = analysisResultService.save(userId, scanImageId, response);

            storeOverlay(scanImage, response);

            return response.toBuilder()
                    .analysisResultId(saved.getId())
                    .zoneScore(saved.getZoneScore())
                    .zoneValid(saved.getZoneValid())
                    .detectedToothCount(saved.getDetectedToothCount())
                    .scoreVersion(saved.getScoreVersion())
                    .build();

        } catch (Exception e) {
            log.error("Error during analyzeSingleImage for scanImageId={}", scanImageId, e);
            throw e;
        } finally {
            aiAnalysisClient.cleanupTask(taskId);
        }
    }

    /**
     * 촬영 직후 경량 화질/구도 판정
     */
    @Transactional(readOnly = true)
    public CaptureQualityResponse checkCaptureQuality(
            Long userId,
            Long sessionId,
            MultipartFile file,
            ViewType viewType,
            LightType lightType
    ) {
        scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(sessionId, userId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));

        String missingTeethCsv = getMissingTeethCsv(userId);

        try {
            return aiAnalysisClient.checkQuality(
                    file.getResource(),
                    file.getOriginalFilename(),
                    viewType,
                    lightType,
                    missingTeethCsv
            );
        } catch (AiAnalysisHandler e) {
            if (e.getErrorCode() == ErrorCode.AI_QUALITY_CHECK_UNAVAILABLE) {
                log.warn("[QUALITY_CHECK] AI 서버 연결 실패로 fail-open 처리. sessionId={}, viewType={}",
                        sessionId, viewType, e);
                return CaptureQualityResponse.builder().needsRetake(false).build();
            }
            throw e;
        }
    }

    /**
     * 세션 단위 AI 분석.
     * @param target 필터링할 병변 타입 (null 이면 전체)
     * @return 이미지별 결과 + zone 단순 평균 세션 점수를 함께 담은 결과
     */
    @Transactional
    public SessionAnalysisResult analyzeSession(Long userId, Long sessionId, LesionType target) {
        // 세션 생성 시점에도 막지만, 프로필 없이 분석까지 흘러들어와 결손치를 0개로
        // 오인해 조용히 잘못된 번호 매핑이 되는 것보다 명시적 에러가 낫다.
        if (!userRepository.existsByIdAndToothProfileSetAtIsNotNull(userId)) {
            throw new ScanHandler(ErrorCode.TOOTH_PROFILE_NOT_SET);
        }

        ScanSession session = scanSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));

        session.updateStatus(ScanSessionStatus.SCANNING);

        List<ScanImage> scanImages = scanImageRepository.findAllByScanSessionId(sessionId);
        if (scanImages.isEmpty()) {
            throw new ScanHandler(ErrorCode.NO_IMAGES_IN_SESSION);
        }

        List<AiAnalyzeResponse> totalResponses = new ArrayList<>();

        // 구역 → (병변 타입 → zoneScore).
        Map<ViewType, Map<LesionType, Double>> zoneScoresByLesion = new LinkedHashMap<>();
        Set<ViewType> capturedZones = new LinkedHashSet<>();
        int failedCount = 0;

        // zone 순서 → 같은 zone 안에서는 백색광 먼저. (session, view, light) 유니크라 zone 당 최대 한 쌍.
        List<ScanImage> orderedImages = scanImages.stream()
                .sorted(Comparator.comparing(ScanImage::getViewType)
                        .thenComparing(image -> image.getLightType() == LightType.UV_LIGHT ? 1 : 0))
                .toList();

        String missingTeethCsv = getMissingTeethCsv(userId);
        // 분석에 성공한 백색광 task 만 등록 → 같은 zone UV 의 calculus_task_id 로 쓴다.
        Map<ViewType, String> whiteTaskIdByZone = new EnumMap<>(ViewType.class);
        List<String> createdTaskIds = new ArrayList<>();

        try {
            for (ScanImage image : orderedImages) {
                capturedZones.add(image.getViewType());
                boolean isUv = image.getLightType() == LightType.UV_LIGHT;

                try {
                    Resource imageResource = scanImageService.getImageResource(userId, image.getId());
                    String filename = scanImageService.getImageFilename(userId, image.getId());

                    String taskId = aiAnalysisClient.initTask(missingTeethCsv);
                    createdTaskIds.add(taskId);

                    AiAnalyzeResponse analyzeResponse;
                    if (isUv) {
                        String calculusTaskId = whiteTaskIdByZone.get(image.getViewType());
                        if (calculusTaskId == null) {
                            log.warn("[AI_UV] zone={} 백색광 분석 결과 없음(미촬영/실패) → calculus_task_id 없이 UV 분석",
                                    image.getViewType());
                        }
                        analyzeResponse = aiAnalysisClient.analyzeUv(
                                taskId, image.getId(), imageResource, filename,
                                image.getViewType(), sessionId, calculusTaskId);
                    } else {
                        analyzeResponse = aiAnalysisClient.analyzeWhite(
                                taskId, image.getId(), imageResource, filename,
                                image.getViewType(), sessionId);
                        whiteTaskIdByZone.put(image.getViewType(), taskId);
                    }

                    List<DetectedIssueResult> sourceIssues = analyzeResponse.getIssues() != null
                            ? analyzeResponse.getIssues()
                            : new ArrayList<>();

                    List<DetectedIssueResult> activeIssues = new ArrayList<>(sourceIssues);

                    if (target != null) {
                        activeIssues = sourceIssues.stream()
                                .filter(issue -> issue.getLesionType() == target)
                                .toList();

                        // ⚠️ target 필터는 issues(원시 병변 목록)에만 적용한다.
                        //    toBuilder() 로 issues 만 갈아끼워 나머지 필드(zoneScore/toothStatuses/
                        //    totalCalculusRatio/scoreVersion 등)가 절대 유실되지 않게 한다.
                        //    (기존엔 builder() 로 새로 만들면서 새 점수 필드가 통째로 날아갔다)
                        analyzeResponse = analyzeResponse.toBuilder()
                                .issues(activeIssues)
                                .build();
                    }

                    toToothLocalPolygons(analyzeResponse, imageWidthOf(image), imageHeightOf(image));

                    // 책임 경계:
                    //   백색광 — FastAPI(report.zoneScore/zoneValid/scoreVersion) 값이 정본. 재계산하지 않는다.
                    //   UV    — 2.3 부터는 FastAPI(fluorescenceZoneScore) 값, 구버전은 Spring 이 형광 치태 비율로 계산.
                    //   두 광원의 합성(combineZoneScore)은 루프가 끝난 뒤 Spring 이 한다.
                    boolean fastApiScored = AiAnalysisConverter.isFastApiScored(image, analyzeResponse);
                    Double zoneScoreValue = fastApiScored
                            ? analyzeResponse.getZoneScore()
                            : ScoreCalculator.zoneScore(analyzeResponse.getToothStatuses());
                    boolean zoneValid = fastApiScored
                            ? Boolean.TRUE.equals(analyzeResponse.getZoneValid()) && zoneScoreValue != null
                            : zoneScoreValue != null;
                    String scoreVersion = fastApiScored ? analyzeResponse.getScoreVersion() : SCORE_VERSION;

                    AnalysisResult savedResult = analysisResultRepository.saveAndFlush(
                            AnalysisResult.builder()
                                    .scanImage(image)
                                    .analysisStatus(AnalysisStatus.SUCCESS)
                                    .viewType(image.getViewType())
                                    .aiTaskId(analyzeResponse.getTaskId())
                                    .zoneScore(zoneScoreValue)
                                    .zoneValid(zoneValid)
                                    .detectedToothCount(analyzeResponse.getDetectedToothCount())
                                    .expectedToothCount(analyzeResponse.getExpectedToothCount())
                                    .coverageRatio(analyzeResponse.getCoverageRatio())
                                    .scoreVersion(scoreVersion)
                                    // 🆕 FastAPI report.summary 값을 그대로 영속화 — 이전에는
                                    //    로그로만 찍고 버려져서, 나중에 히스토리 조회 시 매번
                                    //    AnalysisToothArea 자식들을 다시 집계해야 했다.
                                    .totalCalculusRatio(analyzeResponse.getTotalCalculusRatio())
                                    .totalPlaqueRatio(analyzeResponse.getTotalPlaqueRatio())
                                    // UV: 백색광 치석 2차 검증 결과(applied/reason/치아별 제외 픽셀). 백색광은 null.
                                    .calculusCrossCheckJson(AiAnalysisConverter.toCalculusCrossCheckJson(
                                            analyzeResponse.getCalculusCrossCheck()))
                                    .recommendation(analyzeResponse.getRecommendation())
                                    .build()
                    );

                    // 저장된 PK + Spring 이 계산한 구역 점수 필드를 응답 DTO 에 되채운다.
                    //   ⛔ 이 되채움이 빠져 있어서 POST /analyze 응답의
                    //      zoneScore/zoneValid/scoreVersion 이 전부 null 로 나갔다.
                    analyzeResponse = analyzeResponse.toBuilder()
                            .analysisResultId(savedResult.getId())
                            .zoneScore(zoneScoreValue)
                            .zoneValid(zoneValid)
                            .scoreVersion(scoreVersion)
                            .build();

                    // ★ 치아 단위 결과 저장
                    saveToothStatuses(savedResult, analyzeResponse.getToothStatuses());

                    saveDetectedIssues(savedResult, analyzeResponse.getIssues());

                    storeOverlay(image, analyzeResponse);

                    if (zoneValid) {
                        LesionType measured = image.getLightType() == LightType.UV_LIGHT
                                ? LesionType.PLAQUE
                                : LesionType.CALCULUS;

                        zoneScoresByLesion
                                .computeIfAbsent(image.getViewType(),
                                        k -> new EnumMap<>(LesionType.class))
                                .merge(measured, zoneScoreValue, Math::min);
                    }

                    log.info("[AI_SAVE] imageId={} zone={} light={} zoneScore={} teeth={} issues={}",
                            image.getId(), image.getViewType(), image.getLightType(), zoneScoreValue,
                            analyzeResponse.getTeeth().size(), analyzeResponse.getIssues().size());

                    totalResponses.add(analyzeResponse);

                } catch (Exception e) {
                    failedCount++;
                    log.error("이미지 ID {} (zone={}, light={}) 분석 실패 — 건너뜀",
                            image.getId(), image.getViewType(), image.getLightType(), e);

                    analysisResultRepository.save(
                            AnalysisResult.builder()
                                    .scanImage(image)
                                    .analysisStatus(AnalysisStatus.FAILED)
                                    .viewType(image.getViewType())
                                    .build()
                    );
                }
            }
        } finally {
            createdTaskIds.forEach(aiAnalysisClient::cleanupTask);
        }

        if (failedCount == scanImages.size()) {
            session.updateStatus(ScanSessionStatus.FAILED);
            throw new AiAnalysisHandler(ErrorCode.AI_SERVER_RESPONSE_ERROR);
        }

        Map<ViewType, Double> zoneScores = ScoreCalculator.combineZoneScores(zoneScoresByLesion);
        List<ViewType> invalidZones = capturedZones.stream()
                .filter(zone -> !zoneScores.containsKey(zone))
                .toList();

        Double sessionScore = ScoreCalculator.sessionScore(zoneScores);

        log.info("[SESSION_SCORE] sessionId={} 유효구역={}/{} sessionScore={} 무효구역={}",
                sessionId, zoneScores.size(), capturedZones.size(), sessionScore, invalidZones);

        // TODO(v2.1): ScanSession 에 capture_mode / session_score / oral_health_score /
        //   data_confidence 컬럼을 추가한 뒤 아래를 활성화할 것.

        //   session.updateScores(sessionScore,
        //           scoreService.computeOralHealthScore(userId),
        //           scoreService.computeDataConfidence(userId));

        session.updateStatus(ScanSessionStatus.COMPLETED);

        // 알림 생성 트리거. AFTER_COMMIT 로 소비되므로 여기서 발행해도 분석 트랜잭션엔 영향 없다.
        Integer roundedScore = sessionScore == null ? null : (int) Math.round(sessionScore);
        eventPublisher.publishEvent(new SessionAnalyzedEvent(userId, sessionId, roundedScore));

        return SessionAnalysisResult.builder()
                .imageResults(totalResponses)
                .sessionScore(sessionScore)
                .validZoneCount(zoneScores.size())
                // 이미지 수가 아니라 구역 수. 한 구역을 두 광원으로 찍어도 1로 센다.
                .totalZoneCount(capturedZones.size())
                .invalidZones(invalidZones)
                .failedCount(failedCount)
                .build();
    }

    // ==================================================================
    // 저장
    // ==================================================================

    private void saveToothStatuses(AnalysisResult result, List<ToothStatusResult> teeth) {
        if (teeth == null || teeth.isEmpty()) {
            return;
        }

        for (ToothStatusResult tooth : teeth) {
            analysisToothAreaRepository.save(
                    AnalysisToothArea.builder()
                            .analysisResult(result)
                            .toothNumber(tooth.getToothNumber())
                            // 2.3: 미검출 치아도 행으로 남긴다(리포트의 "미검출" 표시용). 채점·집계는 DETECTED 만.
                            .status(tooth.getStatus() != null ? tooth.getStatus() : ToothDetectionStatus.DETECTED)
                            .templateRegionId(tooth.getTemplateRegionId())
                            .lesionType(tooth.getLesionType())
                            .areaRatio(tooth.getAreaRatio())
                            // 백색광은 FastAPI 가 준 toothScore, UV 형광 치태는 Spring 산식.
                            .toothScore(AiAnalysisConverter.toothScoreOf(tooth))
                            .riskLevel(tooth.getRiskLevel())
                            .build()
            );
        }
    }

    private void saveDetectedIssues(AnalysisResult result, List<DetectedIssueResult> issues) {
        if (issues == null || issues.isEmpty()) {
            return;
        }

        for (DetectedIssueResult issue : issues) {
            String polygonJson;
            try {
                polygonJson = objectMapper.writeValueAsString(issue.getPolygon());
            } catch (Exception e) {
                log.warn("polygon 직렬화 실패 toothNumber={}", issue.getToothNumber(), e);
                polygonJson = "[]";
            }

            analysisDetectedIssueRepository.save(
                    AnalysisDetectedIssue.builder()
                            .analysisResult(result)
                            .toothNumber(issue.getToothNumber())
                            .templateRegionId(issue.getTemplateRegionId())
                            .lesionType(issue.getLesionType())
                            .confidence(issue.getConfidence())
                            // riskLevel 은 치아 단위 지표로 이관되어 여기서는 채우지 않는다.
                            .polygonJson(polygonJson)
                            .build()
            );
        }
    }

    // ==================================================================
    // 오버레이 저장
    // ==================================================================

    private void storeOverlay(ScanImage image, AiAnalyzeResponse response) {
        OverlayImageResult overlay = response == null ? null : response.getOverlay();
        if (overlay == null || overlay.getPng() == null || overlay.getPng().length == 0) {
            return;
        }

        try {
            Long sessionId = image.getScanSession() != null ? image.getScanSession().getId() : null;
            String directory = "scan/" + sessionId + "/overlay";
            String prefix = image.getViewType() + "_"
                    + (image.getLightType() == LightType.UV_LIGHT ? "UV" : "WHITE") + "_overlay";

            String overlayUrl = imageStorage.store(overlay.getPng(), "image/png", ".png", directory, prefix);
            image.setOverlayImageUrl(overlayUrl);
            scanImageRepository.save(image);

            log.info("[AI_OVERLAY] 저장 완료. scanImageId={} url={} size={}x{}",
                    image.getId(), overlayUrl, overlay.getWidth(), overlay.getHeight());
        } catch (RuntimeException e) {
            log.warn("[AI_OVERLAY] 오버레이 저장 실패(무시). scanImageId={}", image.getId(), e);
        }
    }

    // ==================================================================
    // 좌표 변환: 사진 기준 → 치아 bbox 기준
    // ==================================================================

    /**
     * 병변 polygon 을 "검출된 치아 bbox 기준" (u, v) 로 바꾼다. 결과가 그대로 저장된다.
     *
     * <p>3D 오버레이는 FDI 번호 + 치아 안 상대 위치만 있으면 되므로, 사진 기준 좌표와 치아 bbox 를
     * 따로 저장하지 않고 분석 시점에 한 번 접어서 저장한다.
     */
    private void toToothLocalPolygons(AiAnalyzeResponse response, int imageWidth, int imageHeight) {
        if (imageWidth <= 0 || imageHeight <= 0) {
            throw new AiAnalysisHandler(ErrorCode.SCAN_IMAGE_FILE_NOT_READABLE);
        }

        if (response.getIssues() == null) {
            return;
        }

        // FastAPI 는 긴 변이 FASTAPI_PREPROCESS_MAX_SIDE 를 넘으면 축소한 이미지에서 polygon 을 낸다.
        // 치아 polygon 과 병변 polygon(치석, UV 치태 영역) 모두 같은 좌표계라 한 배율로 정규화한다.
        int[] size = fastApiCoordinateSize(imageWidth, imageHeight);
        int width = size[0];
        int height = size[1];

        // FDI → 그 사진에서 검출된 치아 bbox (사진 기준 0~1). 번호 없는 치아는 매핑 대상이 아니다.
        Map<Integer, ToothLocalCoordinateMapper.Bbox> bboxByTooth = new HashMap<>();
        if (response.getTeeth() != null) {
            for (ToothAreaResult tooth : response.getTeeth()) {
                if (tooth.getToothNumber() == null) {
                    continue;
                }
                ToothLocalCoordinateMapper.Bbox bbox =
                        ToothLocalCoordinateMapper.bboxOf(normalizePoints(tooth.getPolygon(), width, height));
                if (bbox != null) {
                    bboxByTooth.putIfAbsent(tooth.getToothNumber(), bbox);
                }
            }
        }

        for (DetectedIssueResult issue : response.getIssues()) {
            ToothLocalCoordinateMapper.Bbox bbox =
                    issue.getToothNumber() == null ? null : bboxByTooth.get(issue.getToothNumber());
            if (bbox == null) {
                if (issue.getToothNumber() != null) {
                    log.warn("[TOOTH_LOCAL] 치아 polygon 없음 → 병변 좌표 비움. toothNumber={}, lesionType={}",
                            issue.getToothNumber(), issue.getLesionType());
                }
                issue.updatePolygon(List.of());
                continue;
            }

            issue.updatePolygon(ToothLocalCoordinateMapper.toToothLocal(
                    normalizePoints(issue.getPolygon(), width, height), bbox));
        }
    }

    /** FastAPI 픽셀 좌표 → 사진 기준 0~1. 반올림은 치아 기준 변환 뒤에 한 번만 한다. */
    private static List<PolygonPoint> normalizePoints(List<PolygonPoint> polygon, int width, int height) {
        if (polygon == null || polygon.isEmpty()) {
            return List.of();
        }
        return polygon.stream()
                .map(p -> PolygonPoint.builder()
                        .x(p.getX() / width)
                        .y(p.getY() / height)
                        .build())
                .toList();
    }

    /** FastAPI 가 polygon 을 계산한 좌표계 크기 (main_v12._resize_long_side_np 와 동일 규칙). */
    static int[] fastApiCoordinateSize(int width, int height) {
        int longSide = Math.max(width, height);
        if (FASTAPI_PREPROCESS_MAX_SIDE <= 0 || longSide <= FASTAPI_PREPROCESS_MAX_SIDE) {
            return new int[]{width, height};
        }
        double scale = (double) FASTAPI_PREPROCESS_MAX_SIDE / longSide;
        return new int[]{(int) (width * scale), (int) (height * scale)};
    }

    // 파일 업로드 경로는 ImageIO 로 읽은 실제 해상도(= FastAPI 로 보내는 저장 파일 크기)가 저장돼 있고,
    // URL 만 받아 만든 행(ScanImageService.createImage)만 폴백을 탄다.
    private static int imageWidthOf(ScanImage image) {
        return image.getWidth() != null ? image.getWidth() : ScanImage.DEFAULT_WIDTH;
    }

    private static int imageHeightOf(ScanImage image) {
        return image.getHeight() != null ? image.getHeight() : ScanImage.DEFAULT_HEIGHT;
    }

    private String getMissingTeethCsv(Long userId) {
        List<Integer> missingTeeth = userMissingToothRepository.findAllByUserId(userId).stream()
                .map(UserMissingTooth::getToothNumber)
                .toList();
        return missingTeeth.isEmpty()
                ? null
                : missingTeeth.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    // ==================================================================
    // 조회
    // ==================================================================

    @Transactional(readOnly = true)
    public MeshCoordinateResponse getMeshCoordinates(Long userId, Long sessionId) {
        // 0. 세션 존재 여부 및 소유권 확인
        ScanSession session = scanSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ScanHandler(ErrorCode.SESSION_NOT_FOUND));
        if (!session.getUserId().equals(userId)) {
            throw new AiAnalysisHandler(ErrorCode.FORBIDDEN);
        }

        // 1. 세션에 해당하는 모든 이슈 데이터를 한 번에 가져옴
        List<AnalysisDetectedIssue> detectionIssues = analysisDetectedIssueRepository.findAllBySessionId(sessionId);
        if (detectionIssues.isEmpty()) {
            throw new AiAnalysisHandler(ErrorCode.AI_REPORT_RESULT_EMPTY);
        }

        // 저장된 polygon 은 이미 치아 bbox 기준 (u, v). 여기서는 구역만으로 정해지는
        // 좌우 반전과 표면(surfaceType)만 입히고, 치아에 매핑되지 않은 병변(빈 polygon)은 뺀다.
        List<MeshCoordinateResponse.Lesion> lesions = new ArrayList<>();
        for (AnalysisDetectedIssue issue : detectionIssues) {
            if (issue.getToothNumber() == null) {
                continue;
            }
            List<PolygonPoint> polygon = parsePolygonJson(issue.getPolygonJson());
            if (polygon.isEmpty()) {
                continue;
            }

            ViewType viewType = issue.getAnalysisResult().getViewType();
            List<MeshCoordinateResponse.ToothLocalPoint> points = polygon.stream()
                    .map(p -> new MeshCoordinateResponse.ToothLocalPoint(
                            ToothLocalCoordinateMapper.mirrorU(p.getX(), viewType),
                            p.getY()))
                    .toList();

            lesions.add(new MeshCoordinateResponse.Lesion(
                    issue.getToothNumber(),
                    ToothLocalCoordinateMapper.surfaceTypeOf(viewType),
                    issue.getLesionType(),
                    points
            ));
        }

        return new MeshCoordinateResponse(sessionId, lesions);
    }

    private List<PolygonPoint> parsePolygonJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<PolygonPoint>>() {});
        } catch (Exception e) {
            log.error("Polygon JSON 파싱 실패", e);
            return List.of();
        }
    }
}