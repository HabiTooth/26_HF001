package com.habitooth.backend.domain.history.service;

import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.entity.AnalysisToothArea;
import com.habitooth.backend.domain.ai.repository.AnalysisResultRepository;
import com.habitooth.backend.domain.ai.repository.AnalysisToothAreaRepository;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.history.dto.HistoryPeriodFilter;
import com.habitooth.backend.domain.history.dto.HistoryScoreFilter;
import com.habitooth.backend.domain.history.dto.response.HistoryListResponse;
import com.habitooth.backend.domain.history.dto.response.HistoryRecordItem;
import com.habitooth.backend.domain.history.dto.response.HistoryScoreTrendItem;
import com.habitooth.backend.domain.history.dto.response.HistoryTodayResponse;
import com.habitooth.backend.domain.history.dto.response.ToothTrendItem;
import com.habitooth.backend.domain.history.dto.response.ZoneScoreTrendItem;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("HistoryService - 측정일 단위 집계 (같은 날 다중 측정 중복 제거)")
class HistoryServiceTest {

    private static final long USER_ID = 1L;

    @Mock
    private ScanSessionRepository scanSessionRepository;
    @Mock
    private AnalysisResultRepository analysisResultRepository;
    @Mock
    private AnalysisToothAreaRepository analysisToothAreaRepository;

    private HistoryService historyService;

    /** 오늘 3회(15:00 / 10:00 / 08:00) + 어제 1회. startedAt DESC 정렬(레포지토리 계약). */
    private ScanSession todayLatest;   // id 13, 오늘 15:00
    private ScanSession todayMid;      // id 12, 오늘 10:00
    private ScanSession todayEarly;    // id 11, 오늘 08:00
    private ScanSession yesterday;     // id 5,  어제 09:00

    @BeforeEach
    void setUp() {
        historyService = new HistoryService(scanSessionRepository, analysisResultRepository, analysisToothAreaRepository);

        LocalDate today = LocalDate.now();
        LocalDate prev = today.minusDays(1);
        todayLatest = session(13L, today.atTime(15, 0));
        todayMid = session(12L, today.atTime(10, 0));
        todayEarly = session(11L, today.atTime(8, 0));
        yesterday = session(5L, prev.atTime(9, 0));

        // 추이 테스트는 세션 목록을 쓰지 않으므로 lenient (strict stubs 의 UnnecessaryStubbing 방지).
        lenient().when(scanSessionRepository.findAllByUserIdAndStatusAndPeriod(
                        eq(USER_ID), eq(ScanSessionStatus.COMPLETED), any()))
                .thenReturn(List.of(todayLatest, todayMid, todayEarly, yesterday));
    }

    @Test
    @DisplayName("getList - 같은 날짜는 그날 최신 세션 1건만, totalCount 도 측정일 수 기준")
    void getList_collapsesSameDayToLatestSession() {
        when(analysisResultRepository.findLatestSuccessBySessionId(13L)).thenReturn(List.of(result(90.0)));
        when(analysisResultRepository.findLatestSuccessBySessionId(5L)).thenReturn(List.of(result(70.0)));

        HistoryListResponse response = historyService.getList(
                USER_ID, HistoryPeriodFilter.ALL, HistoryScoreFilter.ALL, 0, 15);

        assertThat(response.getTotalCount()).isEqualTo(2);
        assertThat(response.getItems())
                .extracting("sessionId")
                .containsExactly(13L, 5L);
        assertThat(response.getItems().get(0).getDate()).isEqualTo(LocalDate.now());
        assertThat(response.getItems().get(0).getScore()).isEqualTo(90);
    }

    @Test
    @DisplayName("getScoreTrend - 측정일 단위로 묶어 시간순 반환 (오늘 3회가 점 1개)")
    void getScoreTrend_onePointPerDate() {
        when(analysisResultRepository.findLatestSuccessBySessionId(13L)).thenReturn(List.of(result(90.0)));
        when(analysisResultRepository.findLatestSuccessBySessionId(5L)).thenReturn(List.of(result(70.0)));

        List<HistoryScoreTrendItem> items = historyService.getScoreTrend(USER_ID);

        assertThat(items)
                .extracting("sessionId")
                .containsExactly(5L, 13L); // 시간순(과거 → 현재)
    }

    @Test
    @DisplayName("getRecords - 측정일 단위 최신순, 오늘 기록은 그날 최신 세션(15:00)")
    void getRecords_oncePerDate() {
        when(analysisResultRepository.findLatestSuccessBySessionId(13L)).thenReturn(List.of(result(90.0)));
        when(analysisResultRepository.findLatestSuccessBySessionId(5L)).thenReturn(List.of(result(70.0)));

        List<HistoryRecordItem> items = historyService.getRecords(USER_ID);

        assertThat(items).extracting("sessionId").containsExactly(13L, 5L);
        assertThat(items.get(0).getTime()).isEqualTo(LocalTime.of(15, 0));
    }

    @Test
    @DisplayName("getToday - scoreDiff 는 오늘 이전 세션이 아니라 직전 측정일(어제)과 비교, 소수 1자리")
    void getToday_scoreDiffComparesPreviousDateNotPreviousSession() {
        when(analysisResultRepository.findLatestSuccessBySessionId(13L)).thenReturn(List.of(result(82.6)));
        when(analysisResultRepository.findLatestSuccessBySessionId(5L)).thenReturn(List.of(result(80.5)));

        HistoryTodayResponse response = historyService.getToday(USER_ID);

        assertThat(response.getSessionId()).isEqualTo(13L);
        assertThat(response.getScore()).isEqualTo(83);     // 82.6 → 반올림
        assertThat(response.getScoreDiff()).isEqualTo(2);  // 83 - 81(어제 80.5 → 81). 정수끼리 빼므로 부동소수 꼬리가 없다
    }

    @Test
    @DisplayName("getZoneTrend - 같은 세션의 백색광·UV 행을 합성하고, 같은 날은 1점, 시간순 반환")
    void getZoneTrend_combinesLightsAndCollapsesSameDay() {
        // 레포지토리 계약: 세션 최신순. 오늘 15:00(백색광 80 + UV 60 → 56), 오늘 10:00(백색광 90), 어제(백색광 70)
        when(analysisResultRepository.findLatestSuccessByUserIdAndViewType(USER_ID, ViewType.LOWER_FRONT))
                .thenReturn(List.of(
                        zoneResult(todayLatest, LightType.WHITE_LIGHT, 80.0),
                        zoneResult(todayLatest, LightType.UV_LIGHT, 60.0),
                        zoneResult(todayMid, LightType.WHITE_LIGHT, 90.0),
                        zoneResult(yesterday, LightType.WHITE_LIGHT, 70.0)));

        List<ZoneScoreTrendItem> items = historyService.getZoneTrend(USER_ID, ViewType.LOWER_FRONT, 4);

        assertThat(items).extracting("sessionId").containsExactly(5L, 13L);
        assertThat(items.get(0).getZoneScore()).isEqualTo(70);
        assertThat(items.get(0).getPlaqueZoneScore()).isNull();
        assertThat(items.get(1).getZoneScore()).isEqualTo(56);          // 100 - 20 - 0.6 × 40
        assertThat(items.get(1).getCalculusZoneScore()).isEqualTo(80);
        assertThat(items.get(1).getPlaqueZoneScore()).isEqualTo(60);
    }

    @Test
    @DisplayName("getZoneTrend - 무효 구역 세션은 건너뛰고(같은 날의 이전 유효 세션 사용) limit 만큼만")
    void getZoneTrend_skipsInvalidAndHonorsLimit() {
        when(analysisResultRepository.findLatestSuccessByUserIdAndViewType(USER_ID, ViewType.LOWER_FRONT))
                .thenReturn(List.of(
                        zoneResult(todayLatest, LightType.WHITE_LIGHT, null),   // 무효 → 점 없음
                        zoneResult(todayMid, LightType.WHITE_LIGHT, 90.0),
                        zoneResult(yesterday, LightType.WHITE_LIGHT, 70.0)));

        List<ZoneScoreTrendItem> items = historyService.getZoneTrend(USER_ID, ViewType.LOWER_FRONT, 1);

        assertThat(items).extracting("sessionId").containsExactly(12L);
    }

    @Test
    @DisplayName("getToothTrend - 설측 구역만 백색광으로 조회하고, 같은 표면 두 구역에 걸친 치아는 면적비가 큰 쪽, 시간순")
    void getToothTrend_picksWorstZonePerSession() {
        AnalysisResult frontToday = zoneResult(todayLatest, LightType.WHITE_LIGHT, 80.0);                    // LOWER_FRONT
        AnalysisResult premolarToday = zoneResult(todayLatest, ViewType.LOWER_RIGHT_PREMOLAR, LightType.WHITE_LIGHT, 85.0);
        AnalysisResult frontYesterday = zoneResult(yesterday, LightType.WHITE_LIGHT, 70.0);

        when(analysisToothAreaRepository.findLatestSuccessByUserIdAndTooth(
                eq(USER_ID), eq(43),
                argThat(zones -> zones.contains(ViewType.LOWER_FRONT) && !zones.contains(ViewType.OUTER_CENTER)),
                eq(LightType.WHITE_LIGHT)))
                .thenReturn(List.of(
                        toothArea(frontToday, 43, 3.2),
                        toothArea(premolarToday, 43, 12.1),
                        toothArea(frontYesterday, 43, 15.8)));

        List<ToothTrendItem> items = historyService.getToothTrend(
                USER_ID, 43, SurfaceType.INNER, LesionType.CALCULUS, 4);

        assertThat(items).extracting("sessionId").containsExactly(5L, 13L);
        assertThat(items.get(0).getAreaRatio()).isEqualTo(15.8);
        assertThat(items.get(1).getViewType()).isEqualTo(ViewType.LOWER_RIGHT_PREMOLAR);
        assertThat(items.get(1).getAreaRatio()).isEqualTo(12.1);
        assertThat(items.get(1).getToothScore()).isEqualTo(64);     // 100 - 3 × 12.1 = 63.7 → 반올림
        assertThat(items.get(1).getRiskLevel()).isEqualTo(RiskLevel.HIGH);
    }

    private ScanSession session(long id, LocalDateTime startedAt) {
        ScanSession session = ScanSession.builder()
                .userId(USER_ID)
                .deviceId(1L)
                .status(ScanSessionStatus.COMPLETED)
                .startedAt(startedAt)
                .build();
        ReflectionTestUtils.setField(session, "id", id);
        return session;
    }

    /** zoneScore 만 있는 결과 1건 → calcAvgScore 가 그대로 그 점수를 반환. */
    private AnalysisResult result(double zoneScore) {
        return AnalysisResult.builder()
                .zoneScore(zoneScore)
                .viewType(ViewType.UPPER_FRONT)
                .build();
    }

    private AnalysisResult zoneResult(ScanSession session, LightType lightType, Double zoneScore) {
        return zoneResult(session, ViewType.LOWER_FRONT, lightType, zoneScore);
    }

    /** 추이 조회용: 세션·광원이 연결된 결과 1건 (레포지토리가 fetch join 으로 채워 주는 형태). */
    private AnalysisResult zoneResult(ScanSession session, ViewType viewType, LightType lightType, Double zoneScore) {
        ScanImage image = ScanImage.builder()
                .scanSession(session)
                .viewType(viewType)
                .lightType(lightType)
                .build();
        return AnalysisResult.builder()
                .scanImage(image)
                .viewType(viewType)
                .zoneScore(zoneScore)
                .build();
    }

    private AnalysisToothArea toothArea(AnalysisResult result, int fdi, double areaRatio) {
        return AnalysisToothArea.builder()
                .analysisResult(result)
                .toothNumber(fdi)
                .lesionType(LesionType.CALCULUS)
                .areaRatio(areaRatio)
                .toothScore(Math.round((100.0 - 3.0 * areaRatio) * 10) / 10.0)
                .riskLevel(RiskLevel.HIGH)
                .build();
    }
}
