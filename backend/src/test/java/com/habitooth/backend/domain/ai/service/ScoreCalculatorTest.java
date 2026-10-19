package com.habitooth.backend.domain.ai.service;

import com.habitooth.backend.domain.ai.dto.response.ToothStatusResult;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.ViewType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@DisplayName("ScoreCalculator - 구역 점수 합성")
class ScoreCalculatorTest {

    @Nested
    @DisplayName("combineZoneScore")
    class CombineZoneScore {

        @Test
        @DisplayName("백색광만 찍은 구역은 치석 점수가 그대로 구역 점수가 된다")
        void calculusOnly() {
            assertThat(ScoreCalculator.combineZoneScore(70.0, null)).isEqualTo(70.0);
        }

        @Test
        @DisplayName("UV만 찍은 구역은 치태 감점이 가중치만큼만 반영된다")
        void plaqueOnly() {
            // 감점 30 × 0.6 = 18 → 82
            assertThat(ScoreCalculator.combineZoneScore(null, 70.0)).isEqualTo(82.0);
        }

        @Test
        @DisplayName("같은 감점이라도 치석 쪽이 더 크게 깎인다")
        void calculusIsHeavierThanPlaque() {
            Double calculusOnly = ScoreCalculator.combineZoneScore(60.0, null);
            Double plaqueOnly = ScoreCalculator.combineZoneScore(null, 60.0);

            assertThat(calculusOnly).isLessThan(plaqueOnly);
        }

        @Test
        @DisplayName("둘 다 찍은 구역은 감점이 합산돼 어느 한쪽보다 나쁜 점수가 된다")
        void bothLesionsAccumulate() {
            // 치석 감점 20 × 1.0 + 치태 감점 40 × 0.6 = 44 → 56
            Double combined = ScoreCalculator.combineZoneScore(80.0, 60.0);

            assertThat(combined).isEqualTo(56.0);
            assertThat(combined).isLessThan(80.0);
            assertThat(combined).isLessThan(60.0);
        }

        @Test
        @DisplayName("감점 합이 100을 넘어도 0 아래로는 내려가지 않는다")
        void clampedAtZero() {
            assertThat(ScoreCalculator.combineZoneScore(0.0, 0.0)).isEqualTo(0.0);
        }

        @Test
        @DisplayName("두 점수가 모두 없으면 무효 구역(null)")
        void bothMissing() {
            assertThat(ScoreCalculator.combineZoneScore(null, null)).isNull();
        }
    }

    @Nested
    @DisplayName("combineZoneScores + sessionScore")
    class CombineZoneScores {

        @Test
        @DisplayName("구역별로 치석/치태 점수를 합쳐 세션 점수 입력을 만든다")
        void combinesPerZone() {
            Map<ViewType, Map<LesionType, Double>> byZone = new LinkedHashMap<>();
            byZone.put(ViewType.LOWER_FRONT, byLesion(80.0, 60.0));
            byZone.put(ViewType.UPPER_FRONT, byLesion(90.0, null));

            Map<ViewType, Double> combined = ScoreCalculator.combineZoneScores(byZone);

            assertThat(combined)
                    .containsEntry(ViewType.LOWER_FRONT, 56.0)
                    .containsEntry(ViewType.UPPER_FRONT, 90.0);
        }

        @Test
        @DisplayName("한 광원만 유효해도 그 구역은 세션 점수에 포함된다")
        void zoneStaysValidWithOneLight() {
            Map<ViewType, Map<LesionType, Double>> byZone = new LinkedHashMap<>();
            byZone.put(ViewType.LOWER_FRONT, byLesion(null, 70.0));

            Map<ViewType, Double> combined = ScoreCalculator.combineZoneScores(byZone);

            assertThat(combined).containsOnlyKeys(ViewType.LOWER_FRONT);
            assertThat(ScoreCalculator.sessionScore(combined)).isEqualTo(82.0);
        }

        @Test
        @DisplayName("치태만 있는 구역과 치석만 있는 구역이 섞여도 합성 점수의 단순 평균이다")
        void mixedZonesAreSimpleAveraged() {
            Map<ViewType, Map<LesionType, Double>> byZone = new LinkedHashMap<>();
            byZone.put(ViewType.LOWER_FRONT, byLesion(80.0, null));   // 치석만 → 80.0
            byZone.put(ViewType.OUTER_CENTER, byLesion(null, 50.0));  // 치태만 → 100 - 0.6×50 = 70.0

            Double sessionScore = ScoreCalculator.sessionScore(
                    ScoreCalculator.combineZoneScores(byZone));

            assertThat(sessionScore).isEqualTo(75.0);
        }

        private Map<LesionType, Double> byLesion(Double calculus, Double plaque) {
            Map<LesionType, Double> byLesion = new EnumMap<>(LesionType.class);
            if (calculus != null) {
                byLesion.put(LesionType.CALCULUS, calculus);
            }
            if (plaque != null) {
                byLesion.put(LesionType.PLAQUE, plaque);
            }
            return byLesion;
        }
    }

    /**
     * 백색광 zoneScore 출처를 Spring 재계산 → FastAPI(report.zoneScore)로 바꿔도
     * combineZoneScore 입력이 달라지지 않는지 확인한다.
     *
     * <p>{@link #fastApiZoneScore} 는 main_v12.py 의 {@code _tooth_score} + {@code _calculate_zone_metrics}
     * (scoreVersion 2.3: 치아 점수 단순 평균)를 그대로 옮긴 것이다
     * (파이썬 round 는 이진 부동소수의 정확한 값에 HALF_EVEN).
     */
    @Nested
    @DisplayName("FastAPI zoneScore 를 combineZoneScore 입력으로 쓸 때")
    class FastApiZoneScoreInput {

        @Test
        @DisplayName("FDI 중복이 없고 치아 점수가 소수 1자리로 떨어지면 Spring 산식과 정확히 같다 → 합성 결과도 같다")
        void identicalForTypicalInput() {
            // toothScore = 100, 92.5, 79, 62.5 → 평균 83.5
            List<ToothStatusResult> teeth = teeth(new int[]{31, 32, 41, 42}, new double[]{0.0, 2.5, 7.0, 12.5});

            Double spring = ScoreCalculator.zoneScore(teeth);
            Double fastApi = fastApiZoneScore(teeth);

            assertThat(spring).isEqualTo(83.5);
            assertThat(fastApi).isEqualTo(spring);
            assertThat(ScoreCalculator.combineZoneScore(fastApi, 70.0))
                    .isEqualTo(ScoreCalculator.combineZoneScore(spring, 70.0));
        }

        @Test
        @DisplayName("치아 점수가 소수 2자리 이상이면 FastAPI 의 치아 단위 반올림 때문에 최대 0.1 차이가 날 수 있다")
        void differsAtMostByRoundingOtherwise() {
            List<ToothStatusResult> teeth = teeth(new int[]{31, 32, 41}, new double[]{1.17, 4.83, 9.05});

            Double spring = ScoreCalculator.zoneScore(teeth);
            Double fastApi = fastApiZoneScore(teeth);

            assertThat(fastApi).isCloseTo(spring, within(0.1 + 1e-9));
            assertThat(ScoreCalculator.combineZoneScore(fastApi, 70.0))
                    .isCloseTo(ScoreCalculator.combineZoneScore(spring, 70.0), within(0.1 + 1e-9));
        }

        @Test
        @DisplayName("같은 FDI 가 중복되면 FastAPI 는 치아별 최저점 1개만 센다 (Spring 산식은 중복 그대로 평균)")
        void fastApiDeduplicatesByFdi() {
            List<ToothStatusResult> teeth = teeth(new int[]{31, 31, 32, 41}, new double[]{0.0, 10.0, 0.0, 0.0});

            // FastAPI: {31:70, 32:100, 41:100} → 평균 90.0
            assertThat(fastApiZoneScore(teeth)).isEqualTo(90.0);
            // Spring 산식: {100, 70, 100, 100} → 평균 92.5
            assertThat(ScoreCalculator.zoneScore(teeth)).isEqualTo(92.5);
        }

        @Test
        @DisplayName("검출 치아 2개 미만이면 둘 다 무효(null) → 그 구역은 UV 치태 점수만으로 합성된다")
        void bothInvalidBelowMinimumTeeth() {
            List<ToothStatusResult> teeth = teeth(new int[]{31}, new double[]{5.0});

            assertThat(fastApiZoneScore(teeth)).isNull();
            assertThat(ScoreCalculator.zoneScore(teeth)).isNull();
            assertThat(ScoreCalculator.combineZoneScore(fastApiZoneScore(teeth), 70.0)).isEqualTo(82.0);
        }

        private List<ToothStatusResult> teeth(int[] fdis, double[] areaRatios) {
            List<ToothStatusResult> teeth = new java.util.ArrayList<>();
            for (int i = 0; i < fdis.length; i++) {
                teeth.add(ToothStatusResult.builder()
                        .toothNumber(fdis[i])
                        .lesionType(LesionType.CALCULUS)
                        .areaRatio(areaRatios[i])
                        .build());
            }
            return teeth;
        }

        /** main_prod._calculate_zone_metrics 미러 (scoreVersion 2.3 단순 평균, DAMAGE_K=3.0, ZONE_MIN_TOOTH_COUNT=2). */
        private Double fastApiZoneScore(List<ToothStatusResult> teeth) {
            Map<Integer, Double> scoreByFdi = new HashMap<>();
            for (ToothStatusResult t : teeth) {
                double toothScore = pyRound1(Math.max(0.0, 100.0 - 3.0 * t.getAreaRatio()));
                scoreByFdi.merge(t.getToothNumber(), toothScore, Math::min);
            }
            if (scoreByFdi.size() < 2) {
                return null;
            }
            double avg = scoreByFdi.values().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            return pyRound1(avg);
        }

        private double pyRound1(double value) {
            return new BigDecimal(value).setScale(1, RoundingMode.HALF_EVEN).doubleValue();
        }
    }

    /** 2.3 응답처럼 toothStatuses 에 미검출 치아(NOT_DETECTED/SKIPPED)가 섞여 올 때의 구역 점수. */
    @Nested
    @DisplayName("zoneScore - 검출 상태 반영")
    class ZoneScoreWithDetectionStatus {

        @Test
        @DisplayName("미검출 치아는 평균에서 빠지고 분모(기대 치아)에만 들어간다")
        void notDetectedExcludedFromAverage() {
            List<ToothStatusResult> teeth = List.of(
                    tooth(31, ToothDetectionStatus.DETECTED, 0.0),      // 100
                    tooth(41, ToothDetectionStatus.DETECTED, 10.0),     // 70
                    tooth(32, ToothDetectionStatus.NOT_DETECTED, null));

            // 검출 2/3 = 0.67 ≥ 0.6 → 유효, 평균 (100 + 70) / 2
            assertThat(ScoreCalculator.zoneScore(teeth)).isEqualTo(85.0);
        }

        @Test
        @DisplayName("커버리지가 60% 미만이면 검출 치아가 2개 이상이어도 무효")
        void lowCoverageInvalidates() {
            List<ToothStatusResult> teeth = List.of(
                    tooth(31, ToothDetectionStatus.DETECTED, 0.0),
                    tooth(41, ToothDetectionStatus.DETECTED, 10.0),
                    tooth(32, ToothDetectionStatus.NOT_DETECTED, null),
                    tooth(42, ToothDetectionStatus.SKIPPED, null),
                    tooth(33, ToothDetectionStatus.NOT_DETECTED, null));

            assertThat(ScoreCalculator.zoneScore(teeth)).isNull();   // 2/5 = 0.4
        }

        @Test
        @DisplayName("status 가 없는 구버전 응답은 전부 검출 치아로 본다 (기존 동작 유지)")
        void legacyRowsWithoutStatusAreDetected() {
            List<ToothStatusResult> teeth = List.of(
                    tooth(31, null, 0.0),
                    tooth(41, null, 10.0));

            assertThat(ScoreCalculator.zoneScore(teeth)).isEqualTo(85.0);
            assertThat(ScoreCalculator.isScorable(teeth.get(0))).isTrue();
        }

        private ToothStatusResult tooth(int fdi, ToothDetectionStatus status, Double areaRatio) {
            return ToothStatusResult.builder()
                    .toothNumber(fdi)
                    .status(status)
                    .lesionType(LesionType.CALCULUS)
                    .areaRatio(areaRatio)
                    .build();
        }
    }

    /** 조회 API(리포트/대시보드/히스토리)가 쓰는 세션 점수가 POST /analyze 와 같은 구역 단순 평균인지 확인한다. */
    @Nested
    @DisplayName("sessionScore(List<AnalysisResult>)")
    class SessionScoreFromResults {

        @Test
        @DisplayName("구역에 가중치를 두지 않는 단순 평균이다")
        void simpleAverageOfZones() {
            List<AnalysisResult> results = List.of(
                    result(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 80.0),
                    result(ViewType.OUTER_CENTER, LightType.WHITE_LIGHT, 50.0));

            assertThat(ScoreCalculator.sessionScore(results)).isEqualTo(65.0);
            assertThat(ScoreCalculator.sessionScoreOrZero(results)).isEqualTo(65);
        }

        @Test
        @DisplayName("구역 수가 달라도 각 구역이 같은 비중으로 들어간다")
        void everyZoneWeighsTheSame() {
            List<AnalysisResult> results = List.of(
                    result(ViewType.UPPER_FRONT, LightType.WHITE_LIGHT, 91.2),
                    result(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 82.7),
                    result(ViewType.LOWER_RIGHT_MOLAR, LightType.WHITE_LIGHT, 68.4),
                    result(ViewType.OUTER_CENTER, LightType.WHITE_LIGHT, 88.0));

            // (91.2 + 82.7 + 68.4 + 88.0) / 4 = 82.575 → 82.6 (리포트 UI 예시와 동일)
            assertThat(ScoreCalculator.sessionScore(results)).isEqualTo(82.6);
        }

        @Test
        @DisplayName("같은 구역의 백색광·UV 행은 합성한 뒤 한 구역으로 센다")
        void combinesBothLightsPerZone() {
            List<AnalysisResult> results = List.of(
                    result(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, 80.0),
                    result(ViewType.LOWER_FRONT, LightType.UV_LIGHT, 60.0));

            // 치석 감점 20 + 치태 감점 40 × 0.6 = 44 → 56, 구역 1개뿐이라 평균도 56
            assertThat(ScoreCalculator.sessionScore(results)).isEqualTo(56.0);
        }

        @Test
        @DisplayName("유효 구역이 없으면 null / 정수 노출은 0")
        void noValidZone() {
            List<AnalysisResult> results = List.of(result(ViewType.LOWER_FRONT, LightType.WHITE_LIGHT, null));

            assertThat(ScoreCalculator.sessionScore(results)).isNull();
            assertThat(ScoreCalculator.sessionScoreOrZero(results)).isZero();
        }

        private AnalysisResult result(ViewType viewType, LightType lightType, Double zoneScore) {
            ScanImage image = ScanImage.builder().viewType(viewType).lightType(lightType).build();
            return AnalysisResult.builder().scanImage(image).viewType(viewType).zoneScore(zoneScore).build();
        }
    }
}
