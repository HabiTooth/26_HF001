package com.habitooth.backend.domain.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.habitooth.backend.domain.ai.client.FastApiAiAnalysisClient;
import com.habitooth.backend.domain.ai.dto.response.AiAnalyzeResponse;
import com.habitooth.backend.domain.ai.dto.response.CalculusCrossCheckResult;
import com.habitooth.backend.domain.ai.dto.response.CaptureQualityResponse;
import com.habitooth.backend.domain.ai.dto.response.DetectedIssueResult;
import com.habitooth.backend.domain.ai.dto.response.MeshCoordinateResponse;
import com.habitooth.backend.domain.ai.dto.response.OverlayImageResult;
import com.habitooth.backend.domain.ai.dto.response.PolygonPoint;
import com.habitooth.backend.domain.ai.dto.response.ToothAreaResult;
import com.habitooth.backend.domain.ai.dto.response.SessionAnalysisResult;
import com.habitooth.backend.domain.ai.dto.response.ToothStatusResult;
import com.habitooth.backend.domain.ai.entity.AnalysisDetectedIssue;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisDetectedIssueRepository;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.repository.AnalysisToothAreaRepository;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.SurfaceType;
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
import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import com.habitooth.backend.global.error.handler.ScanHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.Resource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiAnalysisServiceTest {

    private static final long USER_ID = 1L;
    private static final long SESSION_ID = 10L;

    @Mock
    private FastApiAiAnalysisClient aiAnalysisClient;
    @Mock
    private ScanImageService scanImageService;
    @Mock
    private ScanSessionRepository scanSessionRepository;
    @Mock
    private ScanImageRepository scanImageRepository;
    @Mock
    private AnalysisResultService analysisResultService;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private AnalysisDetectedIssueRepository analysisDetectedIssueRepository;
    @Mock
    private AnalysisResultRepository analysisResultRepository;
    @Mock
    private AnalysisToothAreaRepository analysisToothAreaRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserMissingToothRepository userMissingToothRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private ImageStorage imageStorage;

    @InjectMocks
    private AiAnalysisService aiAnalysisService;

    private ScanSession session;
    private MultipartFile file;

    @BeforeEach
    void setUp() {
        session = ScanSession.builder().userId(USER_ID).deviceId(100L).build();
        ReflectionTestUtils.setField(session, "id", SESSION_ID);

        file = mock(MultipartFile.class);
    }

    @Test
    @DisplayName("존재하지 않거나 남의 세션이면 SESSION_NOT_FOUND")
    void checkCaptureQuality_sessionNotFound_throws() {
        when(scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(SESSION_ID, USER_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> aiAnalysisService.checkCaptureQuality(
                USER_ID, SESSION_ID, file, ViewType.UPPER_RIGHT_MOLAR, LightType.WHITE_LIGHT))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.SESSION_NOT_FOUND);
    }

    @Test
    @DisplayName("판정 통과(needsRetake=false) - 판정 결과를 그대로 반환")
    void checkCaptureQuality_pass_returnsResponse() {
        when(scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(SESSION_ID, USER_ID))
                .thenReturn(Optional.of(session));
        when(userMissingToothRepository.findAllByUserId(USER_ID)).thenReturn(List.of());
        when(file.getResource()).thenReturn(mock(Resource.class));
        when(file.getOriginalFilename()).thenReturn("test.jpg");

        CaptureQualityResponse expected = CaptureQualityResponse.builder().needsRetake(false).build();
        when(aiAnalysisClient.checkQuality(any(), anyString(), eq(ViewType.UPPER_RIGHT_MOLAR),
                eq(LightType.WHITE_LIGHT), isNull()))
                .thenReturn(expected);

        CaptureQualityResponse response = aiAnalysisService.checkCaptureQuality(
                USER_ID, SESSION_ID, file, ViewType.UPPER_RIGHT_MOLAR, LightType.WHITE_LIGHT);

        assertThat(response.getNeedsRetake()).isFalse();
    }

    @Test
    @DisplayName("판정 실패(needsRetake=true) - reason/message 를 그대로 반환")
    void checkCaptureQuality_needsRetake_returnsResponse() {
        when(scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(SESSION_ID, USER_ID))
                .thenReturn(Optional.of(session));
        when(userMissingToothRepository.findAllByUserId(USER_ID)).thenReturn(List.of());
        when(file.getResource()).thenReturn(mock(Resource.class));
        when(file.getOriginalFilename()).thenReturn("test.jpg");

        CaptureQualityResponse expected = CaptureQualityResponse.builder()
                .needsRetake(true)
                .reason("TOOTH_NOT_DETECTED")
                .message("치아가 1개만 인식되었습니다 (예상 3개). 각도와 거리를 확인해주세요.")
                .build();
        when(aiAnalysisClient.checkQuality(any(), anyString(), any(), any(), any()))
                .thenReturn(expected);

        CaptureQualityResponse response = aiAnalysisService.checkCaptureQuality(
                USER_ID, SESSION_ID, file, ViewType.UPPER_RIGHT_MOLAR, LightType.WHITE_LIGHT);

        assertThat(response.getNeedsRetake()).isTrue();
        assertThat(response.getReason()).isEqualTo("TOOTH_NOT_DETECTED");
    }

    @Test
    @DisplayName("결손치가 있으면 FDI 번호를 콤마 CSV로 만들어 클라이언트에 전달")
    void checkCaptureQuality_missingTeeth_buildsCsv() {
        when(scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(SESSION_ID, USER_ID))
                .thenReturn(Optional.of(session));
        when(userMissingToothRepository.findAllByUserId(USER_ID)).thenReturn(List.of(
                UserMissingTooth.of(USER_ID, 18),
                UserMissingTooth.of(USER_ID, 28)
        ));
        when(file.getResource()).thenReturn(mock(Resource.class));
        when(file.getOriginalFilename()).thenReturn("test.jpg");
        when(aiAnalysisClient.checkQuality(any(), anyString(), any(), any(), any()))
                .thenReturn(CaptureQualityResponse.builder().needsRetake(false).build());

        aiAnalysisService.checkCaptureQuality(
                USER_ID, SESSION_ID, file, ViewType.UPPER_RIGHT_MOLAR, LightType.WHITE_LIGHT);

        ArgumentCaptor<String> csvCaptor = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(aiAnalysisClient).checkQuality(
                any(), anyString(), any(), any(), csvCaptor.capture());
        assertThat(csvCaptor.getValue()).isEqualTo("18,28");
    }

    @Test
    @DisplayName("AI 서버 연결 실패 - fail-open, needsRetake=false 로 통과시키고 예외를 던지지 않는다")
    void checkCaptureQuality_aiServerUnavailable_failsOpen() {
        when(scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(SESSION_ID, USER_ID))
                .thenReturn(Optional.of(session));
        when(userMissingToothRepository.findAllByUserId(USER_ID)).thenReturn(List.of());
        when(file.getResource()).thenReturn(mock(Resource.class));
        when(file.getOriginalFilename()).thenReturn("test.jpg");
        when(aiAnalysisClient.checkQuality(any(), anyString(), any(), any(), any()))
                .thenThrow(new AiAnalysisHandler(ErrorCode.AI_QUALITY_CHECK_UNAVAILABLE));

        CaptureQualityResponse response = aiAnalysisService.checkCaptureQuality(
                USER_ID, SESSION_ID, file, ViewType.UPPER_RIGHT_MOLAR, LightType.WHITE_LIGHT);

        assertThat(response.getNeedsRetake()).isFalse();
    }

    @Test
    @DisplayName("FastAPI가 요청 자체를 거부(isSuccess=false 유래) - fail-open 대상이 아니라 그대로 전파")
    void checkCaptureQuality_invalidRequest_propagates() {
        when(scanSessionRepository.findByIdAndUserIdAndDeletedAtIsNull(SESSION_ID, USER_ID))
                .thenReturn(Optional.of(session));
        when(userMissingToothRepository.findAllByUserId(USER_ID)).thenReturn(List.of());
        when(file.getResource()).thenReturn(mock(Resource.class));
        when(file.getOriginalFilename()).thenReturn("test.jpg");
        when(aiAnalysisClient.checkQuality(any(), anyString(), any(), any(), any()))
                .thenThrow(new AiAnalysisHandler(ErrorCode.AI_QUALITY_CHECK_INVALID_REQUEST));

        assertThatThrownBy(() -> aiAnalysisService.checkCaptureQuality(
                USER_ID, SESSION_ID, file, ViewType.UPPER_RIGHT_MOLAR, LightType.WHITE_LIGHT))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.AI_QUALITY_CHECK_INVALID_REQUEST);
    }

    // ==================================================================
    // analyzeSession — 결과 오버레이 저장
    // ==================================================================

    @Test
    @DisplayName("FastAPI 가 오버레이 PNG 를 주면 저장소에 올리고 ScanImage.overlayImageUrl 에 경로를 남긴다")
    void analyzeSession_storesOverlayWhenPresent() {
        ScanImage white = scanImage(2L, ZONE, LightType.WHITE_LIGHT, 3200, 2400);
        givenSession(List.of(white));
        givenSaveAndFlushAssignsId();

        byte[] png = {(byte) 0x89, 'P', 'N', 'G'};
        when(aiAnalysisClient.initTask("18")).thenReturn(WHITE_TASK);
        when(aiAnalysisClient.analyzeWhite(eq(WHITE_TASK), eq(2L), any(), anyString(), eq(ZONE), eq(SESSION_ID)))
                .thenReturn(whiteResponse(82.4, true).toBuilder()
                        .overlay(OverlayImageResult.builder().png(png).width(1600).height(1200).build())
                        .build());
        when(imageStorage.store(eq(png), eq("image/png"), eq(".png"), eq("scan/10/overlay"), eq("UPPER_FRONT_WHITE_overlay")))
                .thenReturn("/uploads/scan/10/overlay/UPPER_FRONT_WHITE_overlay_x.png");

        aiAnalysisService.analyzeSession(USER_ID, SESSION_ID, null);

        assertThat(white.getOverlayImageUrl()).isEqualTo("/uploads/scan/10/overlay/UPPER_FRONT_WHITE_overlay_x.png");
        verify(scanImageRepository).save(white);
    }

    @Test
    @DisplayName("오버레이 저장이 실패해도 분석 결과는 정상 저장된다 (오버레이는 보조 산출물)")
    void analyzeSession_overlayStoreFailureDoesNotFailAnalysis() {
        ScanImage white = scanImage(2L, ZONE, LightType.WHITE_LIGHT, 3200, 2400);
        givenSession(List.of(white));
        givenSaveAndFlushAssignsId();

        when(aiAnalysisClient.initTask("18")).thenReturn(WHITE_TASK);
        when(aiAnalysisClient.analyzeWhite(eq(WHITE_TASK), eq(2L), any(), anyString(), eq(ZONE), eq(SESSION_ID)))
                .thenReturn(whiteResponse(82.4, true).toBuilder()
                        .overlay(OverlayImageResult.builder().png(new byte[]{1}).build())
                        .build());
        when(imageStorage.store(any(byte[].class), anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new ScanHandler(ErrorCode.FILE_SAVE_FAILED));

        SessionAnalysisResult result = aiAnalysisService.analyzeSession(USER_ID, SESSION_ID, null);

        assertThat(result.getFailedCount()).isZero();
        assertThat(result.getSessionScore()).isEqualTo(82.4);
        assertThat(white.getOverlayImageUrl()).isNull();
    }

    // ==================================================================
    // analyzeSession — 백색광/UV 짝 분석 (FastAPI v12 계약)
    // ==================================================================

    private static final ViewType ZONE = ViewType.UPPER_FRONT;
    private static final String WHITE_TASK = "white-task";
    private static final String UV_TASK = "uv-task";

    private ScanImage scanImage(long id, ViewType viewType, LightType lightType, int width, int height) {
        ScanImage image = ScanImage.builder()
                .scanSession(session)
                .viewType(viewType)
                .lightType(lightType)
                .build();
        image.setId(id);
        image.setWidth(width);
        image.setHeight(height);
        return image;
    }

    private void givenSession(List<ScanImage> images) {
        when(userRepository.existsByIdAndToothProfileSetAtIsNotNull(USER_ID)).thenReturn(true);
        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(scanImageRepository.findAllByScanSessionId(SESSION_ID)).thenReturn(images);
        when(userMissingToothRepository.findAllByUserId(USER_ID))
                .thenReturn(List.of(UserMissingTooth.of(USER_ID, 18)));
        when(scanImageService.getImageResource(eq(USER_ID), anyLong())).thenReturn(mock(Resource.class));
        when(scanImageService.getImageFilename(eq(USER_ID), anyLong())).thenReturn("img.jpg");
    }

    private void givenSaveAndFlushAssignsId() {
        AtomicLong seq = new AtomicLong(100);
        when(analysisResultRepository.saveAndFlush(any(AnalysisResult.class))).thenAnswer(inv -> {
            AnalysisResult result = inv.getArgument(0);
            ReflectionTestUtils.setField(result, "id", seq.getAndIncrement());
            return result;
        });
    }

    /**
     * FastAPI 백색광 결과. 치아가 1개뿐이라 Spring 산식(MIN_VALID_TEETH=3)으로 재계산하면 null 이
     * 나오지만 FastAPI 는 82.4/valid 를 준 상황 — 저장값이 FastAPI 값인지 구분하기 위한 구성이다.
     * toothScore 도 Spring 산식(100 - 3 × 2.8 = 91.6)과 다른 90.0 으로 둬서 출처를 구분한다.
     */
    private AiAnalyzeResponse whiteResponse(Double zoneScore, boolean zoneValid) {
        return AiAnalyzeResponse.builder()
                .taskId(WHITE_TASK)
                .viewType(ZONE)
                .teeth(List.of(toothArea(11, 400, 300, 1200, 900)))
                .issues(new ArrayList<>(List.of(DetectedIssueResult.builder()
                        .toothNumber(11)
                        .lesionType(LesionType.CALCULUS)
                        .confidence(0.42)
                        .polygon(List.of(PolygonPoint.builder().x(800.0).y(600.0).build()))
                        .build())))
                .zoneScore(zoneScore)
                .zoneValid(zoneValid)
                .detectedToothCount(4)
                .scoreVersion("2.2")
                .toothStatuses(List.of(ToothStatusResult.builder()
                        .toothNumber(11)
                        .lesionType(LesionType.CALCULUS)
                        .areaRatio(2.8)
                        .toothScore(90.0)
                        .riskLevel(RiskLevel.LOW)
                        .build()))
                .totalCalculusRatio(1.2)
                .totalPlaqueRatio(0.0)
                .build();
    }

    /** develop 방식의 UV 결과: 형광 치태가 toothStatuses(PLAQUE)·issues(confidence=null)로 온다. */
    private AiAnalyzeResponse uvResponse(CalculusCrossCheckResult crossCheck) {
        List<ToothStatusResult> plaqueTeeth = List.of(11, 12, 21).stream()
                .map(fdi -> ToothStatusResult.builder()
                        .toothNumber(fdi)
                        .lesionType(LesionType.PLAQUE)
                        .areaRatio(10.0)   // Spring 산식 toothScore = 70.0
                        .riskLevel(RiskLevel.HIGH)
                        .build())
                .toList();

        return AiAnalyzeResponse.builder()
                .taskId(UV_TASK)
                .viewType(ZONE)
                .teeth(List.of(toothArea(11, 320, 240, 960, 720)))
                .issues(new ArrayList<>(List.of(DetectedIssueResult.builder()
                        .toothNumber(11)
                        .lesionType(LesionType.PLAQUE)
                        .polygon(List.of(PolygonPoint.builder().x(640.0).y(480.0).build()))
                        .build())))
                .detectedToothCount(3)
                .toothStatuses(plaqueTeeth)
                .totalCalculusRatio(0.0)
                .totalPlaqueRatio(8.3)
                .calculusCrossCheck(crossCheck)
                .build();
    }

    @Test
    @DisplayName("같은 zone: 백색광 calculus → UV plaque-fluorescence(calculus_task_id=백색광) → 두 task cleanup 순서")
    void analyzeSession_whiteThenUv_passesCalculusTaskId_andCleansUpAfterUv() {
        // DB 가 UV 를 먼저 돌려줘도 백색광부터 분석해야 한다.
        ScanImage uv = scanImage(1L, ZONE, LightType.UV_LIGHT, 1280, 960);
        ScanImage white = scanImage(2L, ZONE, LightType.WHITE_LIGHT, 3200, 2400);
        givenSession(List.of(uv, white));
        givenSaveAndFlushAssignsId();

        when(aiAnalysisClient.initTask("18")).thenReturn(WHITE_TASK, UV_TASK);
        when(aiAnalysisClient.analyzeWhite(eq(WHITE_TASK), eq(2L), any(), anyString(), eq(ZONE), eq(SESSION_ID)))
                .thenReturn(whiteResponse(82.4, true));
        when(aiAnalysisClient.analyzeUv(eq(UV_TASK), eq(1L), any(), anyString(), eq(ZONE), eq(SESSION_ID), eq(WHITE_TASK)))
                .thenReturn(uvResponse(CalculusCrossCheckResult.builder()
                        .applied(true).sourceTaskId(WHITE_TASK)
                        .matchedTeeth(List.of("11")).unmatchedTeeth(List.of())
                        .calculusPixels(120L)
                        .teeth(List.of(CalculusCrossCheckResult.ToothExclusion.builder()
                                .areaId(1).toothNumber(11).calculusExcludedPixels(120).build()))
                        .build()));

        SessionAnalysisResult result = aiAnalysisService.analyzeSession(USER_ID, SESSION_ID, null);

        InOrder order = inOrder(aiAnalysisClient);
        order.verify(aiAnalysisClient).initTask("18");
        order.verify(aiAnalysisClient).analyzeWhite(eq(WHITE_TASK), eq(2L), any(), anyString(), eq(ZONE), eq(SESSION_ID));
        order.verify(aiAnalysisClient).initTask("18");
        order.verify(aiAnalysisClient).analyzeUv(eq(UV_TASK), eq(1L), any(), anyString(), eq(ZONE), eq(SESSION_ID), eq(WHITE_TASK));
        order.verify(aiAnalysisClient).cleanupTask(WHITE_TASK);
        order.verify(aiAnalysisClient).cleanupTask(UV_TASK);
        order.verifyNoMoreInteractions();

        // develop 합성 규칙 유지: 치석 82.4(FastAPI) + 치태 70.0(Spring) → 100 - (17.6 + 0.6 × 30) = 64.4
        assertThat(result.getTotalZoneCount()).isEqualTo(1);
        assertThat(result.getValidZoneCount()).isEqualTo(1);
        assertThat(result.getInvalidZones()).isEmpty();
        assertThat(result.getSessionScore()).isEqualTo(64.4);

        ArgumentCaptor<AnalysisResult> saved = ArgumentCaptor.forClass(AnalysisResult.class);
        verify(analysisResultRepository, times(2)).saveAndFlush(saved.capture());
        AnalysisResult whiteSaved = saved.getAllValues().get(0);
        AnalysisResult uvSaved = saved.getAllValues().get(1);

        // 백색광: FastAPI 값 그대로 (Spring 재계산이었다면 치아 1개라 null)
        assertThat(whiteSaved.getZoneScore()).isEqualTo(82.4);
        assertThat(whiteSaved.getZoneValid()).isTrue();
        assertThat(whiteSaved.getScoreVersion()).isEqualTo("2.2");
        assertThat(whiteSaved.getCalculusCrossCheckJson()).isNull();

        // UV: 형광 치태 점수는 develop 로직대로 Spring 이 계산
        assertThat(uvSaved.getZoneScore()).isEqualTo(70.0);
        assertThat(uvSaved.getScoreVersion()).isEqualTo(ScoreCalculator.SCORE_VERSION);
        assertThat(uvSaved.getCalculusCrossCheckJson())
                .contains("\"applied\":true")
                .contains("\"sourceTaskId\":\"white-task\"")
                .contains("\"calculusExcludedPixels\":120");

        // toothScore: 백색광은 FastAPI 값(90.0), UV 는 Spring 산식(70.0)
        ArgumentCaptor<AnalysisToothArea> areas = ArgumentCaptor.forClass(AnalysisToothArea.class);
        verify(analysisToothAreaRepository, times(4)).save(areas.capture());
        assertThat(areas.getAllValues()).extracting(AnalysisToothArea::getToothScore)
                .containsExactly(90.0, 70.0, 70.0, 70.0);

        // 치아 bbox 기준 변환: 백색광은 3200x2400 → FastAPI 1600x1200 좌표계에서 치아 bbox 0.25~0.75,
        //   병변 (800,600)=(0.5,0.5) → u=v=0.5. UV 는 배율 1, 치아 bbox 0.25~0.75, 병변 (640,480) → u=v=0.5.
        //   치석·치태 모두 같은 규칙, 저장 단계에서는 좌우 반전 미적용.
        assertThat(result.getImageResults()).allSatisfy(r ->
                assertThat(r.getIssues()).singleElement().satisfies(issue -> {
                    assertThat(issue.getPolygon().get(0).getX()).isEqualTo(0.5);
                    assertThat(issue.getPolygon().get(0).getY()).isEqualTo(0.5);
                }));
    }

    @Test
    @DisplayName("2.3 응답: 미검출 치아는 NOT_DETECTED 로 저장되고 점수 없음, UV 구역 점수는 FastAPI 값을 그대로 저장")
    void analyzeSession_v23_storesNotDetectedAndFastApiUvScore() {
        ScanImage white = scanImage(2L, ZONE, LightType.WHITE_LIGHT, 1280, 960);
        ScanImage uv = scanImage(1L, ZONE, LightType.UV_LIGHT, 1280, 960);
        givenSession(List.of(white, uv));
        givenSaveAndFlushAssignsId();

        AiAnalyzeResponse whiteV23 = whiteResponse(82.4, true).toBuilder()
                .expectedToothCount(2)
                .coverageRatio(0.5)
                .toothStatuses(List.of(
                        ToothStatusResult.builder().toothNumber(11).status(ToothDetectionStatus.DETECTED)
                                .lesionType(LesionType.CALCULUS).areaRatio(2.8).toothScore(90.0).riskLevel(RiskLevel.LOW).build(),
                        ToothStatusResult.builder().toothNumber(12).status(ToothDetectionStatus.NOT_DETECTED)
                                .lesionType(LesionType.CALCULUS).build()))
                .build();
        // 2.3 UV: 클라이언트가 fluorescenceZoneScore 를 zoneScore 에 싣고 scoreVersion 을 채워 보낸다.
        AiAnalyzeResponse uvV23 = uvResponse(null).toBuilder()
                .zoneScore(62.8).zoneValid(true).scoreVersion("2.3")
                .toothStatuses(List.of(
                        ToothStatusResult.builder().toothNumber(11).status(ToothDetectionStatus.DETECTED)
                                .lesionType(LesionType.PLAQUE).areaRatio(12.4).toothScore(62.8).riskLevel(RiskLevel.HIGH).build(),
                        ToothStatusResult.builder().toothNumber(12).status(ToothDetectionStatus.SKIPPED)
                                .lesionType(LesionType.PLAQUE).build()))
                .build();

        when(aiAnalysisClient.initTask("18")).thenReturn(WHITE_TASK, UV_TASK);
        when(aiAnalysisClient.analyzeWhite(eq(WHITE_TASK), eq(2L), any(), anyString(), eq(ZONE), eq(SESSION_ID)))
                .thenReturn(whiteV23);
        when(aiAnalysisClient.analyzeUv(eq(UV_TASK), eq(1L), any(), anyString(), eq(ZONE), eq(SESSION_ID), eq(WHITE_TASK)))
                .thenReturn(uvV23);

        SessionAnalysisResult result = aiAnalysisService.analyzeSession(USER_ID, SESSION_ID, null);

        // 치석 82.4 + 치태 62.8(FastAPI, Spring 재계산 아님) → 100 - (17.6 + 0.6 × 37.2) = 60.08 → 60.1
        assertThat(result.getSessionScore()).isEqualTo(60.1);

        ArgumentCaptor<AnalysisResult> saved = ArgumentCaptor.forClass(AnalysisResult.class);
        verify(analysisResultRepository, times(2)).saveAndFlush(saved.capture());
        AnalysisResult whiteSaved = saved.getAllValues().get(0);
        AnalysisResult uvSaved = saved.getAllValues().get(1);
        assertThat(whiteSaved.getExpectedToothCount()).isEqualTo(2);
        assertThat(whiteSaved.getCoverageRatio()).isEqualTo(0.5);
        assertThat(uvSaved.getZoneScore()).isEqualTo(62.8);
        assertThat(uvSaved.getZoneValid()).isTrue();
        assertThat(uvSaved.getScoreVersion()).isEqualTo("2.3");

        ArgumentCaptor<AnalysisToothArea> areas = ArgumentCaptor.forClass(AnalysisToothArea.class);
        verify(analysisToothAreaRepository, times(4)).save(areas.capture());
        assertThat(areas.getAllValues())
                .extracting(AnalysisToothArea::getToothNumber, AnalysisToothArea::getStatus, AnalysisToothArea::getToothScore)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(11, ToothDetectionStatus.DETECTED, 90.0),
                        org.assertj.core.groups.Tuple.tuple(12, ToothDetectionStatus.NOT_DETECTED, null),
                        org.assertj.core.groups.Tuple.tuple(11, ToothDetectionStatus.DETECTED, 62.8),
                        org.assertj.core.groups.Tuple.tuple(12, ToothDetectionStatus.SKIPPED, null));
    }

    @Test
    @DisplayName("백색광 분석 실패 zone: UV 는 calculus_task_id=null 로 진행, applied=false/reason 저장, 두 task 모두 cleanup 시도")
    void analyzeSession_whiteFails_uvRunsWithoutCalculusTaskId() {
        ScanImage white = scanImage(2L, ZONE, LightType.WHITE_LIGHT, 1280, 960);
        ScanImage uv = scanImage(1L, ZONE, LightType.UV_LIGHT, 1280, 960);
        givenSession(List.of(white, uv));
        givenSaveAndFlushAssignsId();

        when(aiAnalysisClient.initTask("18")).thenReturn(WHITE_TASK, UV_TASK);
        when(aiAnalysisClient.analyzeWhite(eq(WHITE_TASK), anyLong(), any(), anyString(), eq(ZONE), eq(SESSION_ID)))
                .thenThrow(new AiAnalysisHandler(ErrorCode.AI_CALCULUS_FAILED));
        when(aiAnalysisClient.analyzeUv(eq(UV_TASK), anyLong(), any(), anyString(), eq(ZONE), eq(SESSION_ID), isNull()))
                .thenReturn(uvResponse(CalculusCrossCheckResult.builder()
                        .applied(false).matchedTeeth(List.of()).unmatchedTeeth(List.of())
                        .reason("calculus 미실행").teeth(List.of()).build()));

        SessionAnalysisResult result = aiAnalysisService.analyzeSession(USER_ID, SESSION_ID, null);

        InOrder order = inOrder(aiAnalysisClient);
        order.verify(aiAnalysisClient).analyzeWhite(eq(WHITE_TASK), anyLong(), any(), anyString(), eq(ZONE), eq(SESSION_ID));
        order.verify(aiAnalysisClient).analyzeUv(eq(UV_TASK), anyLong(), any(), anyString(), eq(ZONE), eq(SESSION_ID), isNull());
        // 실패한 백색광 task 도 cleanup 을 시도한다 (FastAPI 가 미완료 task 를 거부해도 클라이언트는 로그만 남김)
        order.verify(aiAnalysisClient).cleanupTask(WHITE_TASK);
        order.verify(aiAnalysisClient).cleanupTask(UV_TASK);

        // develop 구역 집계 유지: 백색광이 실패해도 UV 가 성공했으니 그 구역은 유효 (치태만 → 82.0)
        assertThat(result.getFailedCount()).isEqualTo(1);
        assertThat(result.getTotalZoneCount()).isEqualTo(1);
        assertThat(result.getInvalidZones()).isEmpty();
        assertThat(result.getSessionScore()).isEqualTo(82.0);

        ArgumentCaptor<AnalysisResult> saved = ArgumentCaptor.forClass(AnalysisResult.class);
        verify(analysisResultRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getCalculusCrossCheckJson())
                .contains("\"applied\":false")
                .contains("\"reason\":\"calculus 미실행\"");
    }

    @Test
    @DisplayName("FastAPI 좌표계 크기: 긴 변 1600 이하면 배율 1, 넘으면 긴 변 1600 기준으로 축소(int 절삭)")
    void fastApiCoordinateSize_mirrorsPreprocessResize() {
        assertThat(AiAnalysisService.fastApiCoordinateSize(1280, 960)).containsExactly(1280, 960);
        assertThat(AiAnalysisService.fastApiCoordinateSize(1600, 1200)).containsExactly(1600, 1200);
        assertThat(AiAnalysisService.fastApiCoordinateSize(3200, 2400)).containsExactly(1600, 1200);
        assertThat(AiAnalysisService.fastApiCoordinateSize(1920, 1080)).containsExactly(1600, 900);
        assertThat(AiAnalysisService.fastApiCoordinateSize(1080, 1920)).containsExactly(900, 1600);
        assertThat(AiAnalysisService.fastApiCoordinateSize(4032, 3024)).containsExactly(1600, 1200);
    }

    /** FastAPI 픽셀 좌표계의 치아 영역 (bbox 꼭짓점 4개 polygon). */
    private static ToothAreaResult toothArea(int fdi, double x1, double y1, double x2, double y2) {
        return ToothAreaResult.builder()
                .toothNumber(fdi)
                .polygon(List.of(
                        PolygonPoint.builder().x(x1).y(y1).build(),
                        PolygonPoint.builder().x(x2).y(y1).build(),
                        PolygonPoint.builder().x(x2).y(y2).build(),
                        PolygonPoint.builder().x(x1).y(y2).build()))
                .build();
    }

    @Test
    @DisplayName("치아 번호가 없거나 치아 polygon 이 없는 병변은 좌표를 비워 저장한다 (행은 유지)")
    void analyzeSession_unmappedLesion_storedWithEmptyPolygon() {
        ScanImage white = scanImage(2L, ZONE, LightType.WHITE_LIGHT, 1280, 960);
        givenSession(List.of(white));
        givenSaveAndFlushAssignsId();

        AiAnalyzeResponse response = whiteResponse(82.4, true).toBuilder()
                .teeth(List.of(toothArea(11, 320, 240, 960, 720)))
                .issues(new ArrayList<>(List.of(
                        DetectedIssueResult.builder().toothNumber(null).lesionType(LesionType.CALCULUS).confidence(0.3)
                                .polygon(List.of(PolygonPoint.builder().x(100.0).y(100.0).build())).build(),
                        DetectedIssueResult.builder().toothNumber(12).lesionType(LesionType.CALCULUS).confidence(0.3)
                                .polygon(List.of(PolygonPoint.builder().x(100.0).y(100.0).build())).build(),
                        DetectedIssueResult.builder().toothNumber(11).lesionType(LesionType.CALCULUS).confidence(0.9)
                                // 치아 bbox 밖(위·왼쪽)으로 삐져나온 점은 0 으로 clamp
                                .polygon(List.of(PolygonPoint.builder().x(200.0).y(100.0).build())).build())))
                .build();
        when(aiAnalysisClient.initTask("18")).thenReturn(WHITE_TASK);
        when(aiAnalysisClient.analyzeWhite(eq(WHITE_TASK), anyLong(), any(), anyString(), eq(ZONE), eq(SESSION_ID)))
                .thenReturn(response);

        SessionAnalysisResult result = aiAnalysisService.analyzeSession(USER_ID, SESSION_ID, null);

        List<DetectedIssueResult> issues = result.getImageResults().get(0).getIssues();
        assertThat(issues).hasSize(3);
        assertThat(issues.get(0).getPolygon()).isEmpty();   // toothNumber null
        assertThat(issues.get(1).getPolygon()).isEmpty();   // 치아 12 polygon 없음
        assertThat(issues.get(2).getPolygon()).singleElement().satisfies(p -> {
            assertThat(p.getX()).isEqualTo(0.0);
            assertThat(p.getY()).isEqualTo(0.0);
        });
    }

    // ==================================================================
    // getMeshCoordinates — 3D 오버레이용 병변 좌표
    // ==================================================================

    @Test
    @DisplayName("3D 좌표: 치아 번호·표면·반전을 입혀 내려주고, 치아 미매핑/빈 polygon 병변은 제외한다")
    void getMeshCoordinates_mapsToToothLocalLesions() throws Exception {
        when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));

        AnalysisResult upperFront = AnalysisResult.builder().viewType(ViewType.UPPER_FRONT).build();   // 반전 구역, 설측
        AnalysisResult lowerFront = AnalysisResult.builder().viewType(ViewType.LOWER_FRONT).build();   // 비반전, 설측
        AnalysisResult outerRight = AnalysisResult.builder().viewType(ViewType.OUTER_RIGHT).build();   // 반전, 순측
        List<PolygonPoint> stored = List.of(PolygonPoint.builder().x(0.2).y(0.7).build());
        when(objectMapper.readValue(eq("[pt]"), any(TypeReference.class))).thenReturn(stored);
        when(objectMapper.readValue(eq("[]"), any(TypeReference.class))).thenReturn(List.of());
        when(analysisDetectedIssueRepository.findAllBySessionId(SESSION_ID)).thenReturn(List.of(
                AnalysisDetectedIssue.builder().analysisResult(upperFront)
                        .lesionType(LesionType.CALCULUS).toothNumber(11).confidence(0.8).polygonJson("[pt]").build(),
                AnalysisDetectedIssue.builder().analysisResult(lowerFront)
                        .lesionType(LesionType.PLAQUE).toothNumber(31).polygonJson("[pt]").build(),
                AnalysisDetectedIssue.builder().analysisResult(outerRight)
                        .lesionType(LesionType.CALCULUS).toothNumber(43).confidence(0.7).polygonJson("[pt]").build(),
                AnalysisDetectedIssue.builder().analysisResult(lowerFront)
                        .lesionType(LesionType.CALCULUS).toothNumber(null).confidence(0.6).polygonJson("[pt]").build(),
                AnalysisDetectedIssue.builder().analysisResult(lowerFront)
                        .lesionType(LesionType.CALCULUS).toothNumber(32).confidence(0.6).polygonJson("[]").build()
        ));

        MeshCoordinateResponse response = aiAnalysisService.getMeshCoordinates(USER_ID, SESSION_ID);

        assertThat(response.getSessionId()).isEqualTo(SESSION_ID);
        assertThat(response.getLesions())
                .extracting(MeshCoordinateResponse.Lesion::getToothNumber,
                        MeshCoordinateResponse.Lesion::getSurfaceType,
                        MeshCoordinateResponse.Lesion::getLesionType,
                        l -> l.getPolygon().get(0).getU(),
                        l -> l.getPolygon().get(0).getV())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(11, SurfaceType.INNER, LesionType.CALCULUS, 0.8, 0.7),
                        org.assertj.core.groups.Tuple.tuple(31, SurfaceType.INNER, LesionType.PLAQUE, 0.2, 0.7),
                        org.assertj.core.groups.Tuple.tuple(43, SurfaceType.OUTER, LesionType.CALCULUS, 0.8, 0.7));
    }
}
