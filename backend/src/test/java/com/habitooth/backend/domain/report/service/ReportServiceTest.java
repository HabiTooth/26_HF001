package com.habitooth.backend.domain.report.service;

import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.report.dto.response.SessionZoneReportResponse;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanImageRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.scan.service.ScanImageService;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.AiAnalysisHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportService - 세션 구역 리포트")
class ReportServiceTest {

    private static final long USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;
    private static final long SESSION_ID = 10L;

    @Mock
    private AnalysisResultRepository analysisResultRepository;
    @Mock
    private ScanSessionRepository scanSessionRepository;
    @Mock
    private ScanImageService scanImageService;
    @Mock
    private ScanImageRepository scanImageRepository;

    @InjectMocks
    private ReportService reportService;

    @Nested
    @DisplayName("getSessionZoneReport")
    class GetSessionZoneReport {

        @Test
        @DisplayName("다른 사용자의 세션이면 403(FORBIDDEN)")
        void rejectsOtherUsersSession() {
            when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session()));

            assertThatThrownBy(() -> reportService.getSessionZoneReport(OTHER_USER_ID, SESSION_ID))
                    .isInstanceOf(AiAnalysisHandler.class)
                    .extracting(e -> ((AiAnalysisHandler) e).getErrorCode())
                    .isEqualTo(ErrorCode.FORBIDDEN);

            verifyNoInteractions(scanImageRepository, analysisResultRepository);
        }

        @Test
        @DisplayName("13구역 전부 내려가고 촬영/무효/미촬영이 구분되며, 종합 점수는 유효 구역 단순 평균")
        void buildsAllThirteenZones() {
            ScanSession session = session();
            ScanImage lowerWhite = image(301L, session, ViewType.LOWER_FRONT, LightType.WHITE_LIGHT);
            ScanImage lowerUv = image(302L, session, ViewType.LOWER_FRONT, LightType.UV_LIGHT);
            ScanImage outerWhite = image(303L, session, ViewType.OUTER_CENTER, LightType.WHITE_LIGHT);
            ScanImage upperWhite = image(304L, session, ViewType.UPPER_FRONT, LightType.WHITE_LIGHT); // 분석 실패 → 결과 없음

            when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
            when(scanImageRepository.findAllByScanSessionId(SESSION_ID))
                    .thenReturn(List.of(lowerWhite, lowerUv, outerWhite, upperWhite));
            when(analysisResultRepository.findLatestSuccessBySessionId(SESSION_ID)).thenReturn(List.of(
                    result(lowerWhite, 80.0, 5, 6,
                            tooth(31, LesionType.CALCULUS, 5.0),
                            tooth(41, LesionType.CALCULUS, 0.0),
                            notDetected(32, LesionType.CALCULUS)),   // 2.3: 미검출 치아도 행으로 온다
                    result(lowerUv, 60.0, 4, 6,
                            tooth(31, LesionType.PLAQUE, 10.0),
                            tooth(41, LesionType.PLAQUE, 3.0)),
                    result(outerWhite, 90.0, 6, 8,
                            tooth(11, LesionType.CALCULUS, 0.0))
            ));

            SessionZoneReportResponse response = reportService.getSessionZoneReport(USER_ID, SESSION_ID);

            assertThat(response.getSessionId()).isEqualTo(SESSION_ID);
            assertThat(response.getScannedAt()).isEqualTo(session.getStartedAt());
            assertThat(response.getTotalZoneCount()).isEqualTo(13);
            assertThat(response.getCapturedZoneCount()).isEqualTo(3);   // 두 광원으로 찍은 LOWER_FRONT 도 1
            assertThat(response.getValidZoneCount()).isEqualTo(2);      // UPPER_FRONT 는 결과 없음
            assertThat(response.getSessionScore()).isEqualTo(73);       // (56 + 90) / 2
            assertThat(response.getConfirmedToothCount()).isEqualTo(3); // 31, 41, 11 (미검출 32 제외)
            assertThat(response.getDetectedToothCount()).isEqualTo(11);  // 5 + 6 (백색광 값, UV 4 는 무시)
            assertThat(response.getExpectedToothCount()).isEqualTo(14);  // 6 + 8
            assertThat(response.getCalculusToothCount()).isEqualTo(1);  // 31 (41, 11 은 areaRatio 0)
            assertThat(response.getPlaqueToothCount()).isEqualTo(2);    // 31, 41

            Map<ViewType, SessionZoneReportResponse.ZoneReport> zones = response.getZones().stream()
                    .collect(Collectors.toMap(SessionZoneReportResponse.ZoneReport::getViewType, Function.identity()));
            assertThat(zones).hasSize(13);
            assertThat(response.getZones().get(0).getViewType()).isEqualTo(ViewType.UPPER_RIGHT_MOLAR); // enum 선언 순서

            SessionZoneReportResponse.ZoneReport lowerFront = zones.get(ViewType.LOWER_FRONT);
            assertThat(lowerFront.getCaptured()).isTrue();
            assertThat(lowerFront.getSurfaceType()).isEqualTo(SurfaceType.INNER);
            assertThat(lowerFront.getLightTypes()).containsExactly(LightType.WHITE_LIGHT, LightType.UV_LIGHT);
            assertThat(lowerFront.getWhiteScanImageId()).isEqualTo(301L);
            assertThat(lowerFront.getUvScanImageId()).isEqualTo(302L);
            assertThat(lowerFront.getZoneScore()).isEqualTo(56);          // 100 - 20 - 0.6 × 40
            assertThat(lowerFront.getZoneValid()).isTrue();
            assertThat(lowerFront.getCalculusZoneScore()).isEqualTo(80);
            assertThat(lowerFront.getPlaqueZoneScore()).isEqualTo(60);
            assertThat(lowerFront.getDetectedToothCount()).isEqualTo(5);  // 백색광 값 우선
            assertThat(lowerFront.getExpectedToothCount()).isEqualTo(6);
            assertThat(lowerFront.getCoverageRatio()).isEqualTo(0.833);

            SessionZoneReportResponse.ZoneReport outerCenter = zones.get(ViewType.OUTER_CENTER);
            assertThat(outerCenter.getSurfaceType()).isEqualTo(SurfaceType.OUTER);
            assertThat(outerCenter.getZoneScore()).isEqualTo(90);
            assertThat(outerCenter.getPlaqueZoneScore()).isNull();
            assertThat(outerCenter.getUvScanImageId()).isNull();

            SessionZoneReportResponse.ZoneReport upperFront = zones.get(ViewType.UPPER_FRONT);
            assertThat(upperFront.getCaptured()).isTrue();
            assertThat(upperFront.getWhiteScanImageId()).isEqualTo(304L);
            assertThat(upperFront.getZoneScore()).isNull();
            assertThat(upperFront.getZoneValid()).isFalse();
            assertThat(upperFront.getDetectedToothCount()).isNull();
            assertThat(upperFront.getExpectedToothCount()).isNull();

            SessionZoneReportResponse.ZoneReport notCaptured = zones.get(ViewType.UPPER_LEFT_MOLAR);
            assertThat(notCaptured.getCaptured()).isFalse();
            assertThat(notCaptured.getLightTypes()).isEmpty();
            assertThat(notCaptured.getWhiteScanImageId()).isNull();
            assertThat(notCaptured.getZoneScore()).isNull();
        }

        @Test
        @DisplayName("분석 결과가 없어도 예외 없이 촬영 현황만으로 응답한다 (점수는 전부 null)")
        void respondsWithoutAnalysisResults() {
            ScanSession session = session();
            ScanImage lowerWhite = image(301L, session, ViewType.LOWER_FRONT, LightType.WHITE_LIGHT);

            when(scanSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
            when(scanImageRepository.findAllByScanSessionId(SESSION_ID)).thenReturn(List.of(lowerWhite));
            when(analysisResultRepository.findLatestSuccessBySessionId(SESSION_ID)).thenReturn(List.of());

            SessionZoneReportResponse response = reportService.getSessionZoneReport(USER_ID, SESSION_ID);

            assertThat(response.getSessionScore()).isNull();
            assertThat(response.getValidZoneCount()).isZero();
            assertThat(response.getCapturedZoneCount()).isEqualTo(1);
            assertThat(response.getConfirmedToothCount()).isZero();
            assertThat(response.getDetectedToothCount()).isNull();
            assertThat(response.getExpectedToothCount()).isNull();
            assertThat(response.getZones()).hasSize(13)
                    .allSatisfy(zone -> assertThat(zone.getZoneScore()).isNull());
        }
    }

    private static ScanSession session() {
        ScanSession session = ScanSession.create(USER_ID, 99L);
        ReflectionTestUtils.setField(session, "id", SESSION_ID);
        return session;
    }

    private static ScanImage image(long id, ScanSession session, ViewType viewType, LightType lightType) {
        ScanImage image = ScanImage.builder()
                .scanSession(session)
                .viewType(viewType)
                .lightType(lightType)
                .build();
        image.setId(id);
        return image;
    }

    private static AnalysisResult result(ScanImage image, Double zoneScore, Integer detectedToothCount,
                                         Integer expectedToothCount, AnalysisToothArea... teeth) {
        Double coverage = expectedToothCount == null || detectedToothCount == null
                ? null
                : Math.round(detectedToothCount * 1000.0 / expectedToothCount) / 1000.0;
        return AnalysisResult.builder()
                .scanImage(image)
                .viewType(image.getViewType())
                .zoneScore(zoneScore)
                .detectedToothCount(detectedToothCount)
                .expectedToothCount(expectedToothCount)
                .coverageRatio(coverage)
                .toothAreas(new ArrayList<>(List.of(teeth)))
                .build();
    }

    /** 2.3: 사진에 잡히지 않은 기대 치아. areaRatio/toothScore/riskLevel 없음. */
    private static AnalysisToothArea notDetected(int fdi, LesionType lesionType) {
        return AnalysisToothArea.builder()
                .toothNumber(fdi)
                .status(ToothDetectionStatus.NOT_DETECTED)
                .lesionType(lesionType)
                .build();
    }

    private static AnalysisToothArea tooth(int fdi, LesionType lesionType, double areaRatio) {
        return AnalysisToothArea.builder()
                .toothNumber(fdi)
                .lesionType(lesionType)
                .areaRatio(areaRatio)
                .build();
    }
}
