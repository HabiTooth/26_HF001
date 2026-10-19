package com.habitooth.backend.domain.ai.service;

import com.habitooth.backend.domain.ai.dto.response.ToothStatusResult;
import com.habitooth.backend.domain.ai.entity.AnalysisResult;
import com.habitooth.backend.domain.ai.type.ToothDetectionStatus;
import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import com.habitooth.backend.domain.scan.entity.ScanImage;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 치아 → 구역 → 세션 3단계 점수 산식을 한곳에 모은 유틸.
 *
 * <p>FastAPI 는 치아별 {@code areaRatio}/{@code riskLevel} 만 주고 점수는 주지 않으므로
 * Spring 이 아래 산식으로 합성한다. 여러 서비스에서 같은 산식이 필요해 정적 유틸로 뺐다.
 * (oralHealthScore / 노후화 감쇠 / 주간 점수까지 붙으면 @Component ScoreService 로 승격할 것)
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ScoreCalculator {

    public static final String SCORE_VERSION = "v2.3";

    /** toothScore 감점 계수. 실데이터로 재튜닝 예정인 임시값. */
    private static final double DAMAGE_K = 3.0;

    /** 구역 점수를 신뢰하려면 채점 대상 치아가 최소 이 개수는 있어야 한다. */
    private static final int MIN_VALID_TEETH = 2;   // FastAPI ZONE_MIN_TOOTH_COUNT 와 동일. 한쪽을 바꾸면 다른 쪽도.
    private static final double MIN_COVERAGE_RATIO = 0.6;

    /**
     * 치아 점수 = {@code max(0, 100 - DAMAGE_K × areaRatio)}.
     * areaRatio 가 없으면(병변 없는 치아) 만점(100)으로 본다.
     */
    public static double toothScore(Double areaRatio) {
        if (areaRatio == null) {
            return 100.0;
        }
        return Math.max(0.0, 100.0 - DAMAGE_K * areaRatio);
    }

    /**
     * 구역 점수 = 검출(DETECTED)된 치아 toothScore 의 <b>단순 평균</b>.
     * 검출 치아가 {@value #MIN_VALID_TEETH}개 미만이거나 커버리지(검출/기대)가 {@value #MIN_COVERAGE_RATIO}
     * 미만이면 신뢰 불가로 보고 null. NOT_DETECTED/SKIPPED 행은 분모(기대 치아)에만 들어간다.
     *
     * <p>v2.2 까지는 {@code 0.7 × 평균 + 0.3 × 최저} 였으나, 리포트 UI 가 구역 점수를 "치아 점수의
     * 평균"으로 설명하기로 하면서 FastAPI(scoreVersion 2.3)와 함께 단순 평균으로 확정했다.
     * 2.3 부터는 UV 구역 점수도 FastAPI 가 주므로, 이 메서드는 구버전 FastAPI 의 UV 결과에만 쓰인다.
     */
    public static Double zoneScore(List<ToothStatusResult> toothStatuses) {
        if (toothStatuses == null || toothStatuses.isEmpty()) {
            return null;
        }

        List<ToothStatusResult> detected = toothStatuses.stream()
                .filter(ScoreCalculator::isScorable)
                .toList();
        double coverage = (double) detected.size() / toothStatuses.size();
        if (detected.size() < MIN_VALID_TEETH || coverage < MIN_COVERAGE_RATIO) {
            return null;
        }

        double avg = detected.stream()
                .mapToDouble(t -> toothScore(t.getAreaRatio()))
                .average()
                .orElse(0.0);

        return round1(avg);
    }

    /** 채점 대상 치아인지. status 가 없는(구버전) 행은 전부 검출된 치아다. */
    public static boolean isScorable(ToothStatusResult tooth) {
        return tooth != null
                && (tooth.getStatus() == null || tooth.getStatus() == ToothDetectionStatus.DETECTED);
    }

    /**
     * 병변 심각도 가중치 — 같은 areaRatio 라도 치석이 치태보다 무겁게 감점된다.
     *
     * <p>치태는 칫솔질로 제거되는 가역적 단계지만, 치석은 이미 석회화돼 스케일링 없이는
     * 사라지지 않고 치주질환으로 진행하는 단계다. 그래서 치석 감점은 100%, 치태 감점은
     * 60% 만 반영한다. 실데이터가 쌓이면 재튜닝할 임시값이며, 바꿀 때는
     * {@link #SCORE_VERSION} 도 함께 올릴 것.
     */
    public static final double CALCULUS_SEVERITY_WEIGHT = 1.0;
    public static final double PLAQUE_SEVERITY_WEIGHT = 0.6;

    /**
     * 한 구역의 치석 점수·치태 점수를 하나로 합친다.
     *
     * <p>같은 구역을 백색광(치석 모델)과 UV(형광 치태)로 각각 찍으면 이미지가 2장 생기고
     * 구역 점수도 2개 나온다. 예전엔 나중에 처리된 쪽이 앞쪽을 덮어써서 한쪽 광원의 결과가
     * 통째로 사라졌다.
     *
     * <p>산식은 <b>점수 평균이 아니라 감점 합산</b>이다:
     * {@code 100 - (1.0 × 치석감점 + 0.6 × 치태감점)}.
     * 평균을 내면 "치석은 깨끗한데 치태가 심한" 구역이 중간 점수로 희석돼 버리는 반면,
     * 감점을 더하면 두 병변이 함께 있는 구역이 제대로 더 나쁘게 나온다.
     * 한쪽 광원만 찍은 구역은 그 광원의 감점만 반영된다 — 측정하지 않은 병변을
     * 있다고도, 없다고도 가정하지 않는다.
     *
     * @return 두 점수가 모두 null(= 유효 구역 점수 없음)이면 null
     */
    public static Double combineZoneScore(Double calculusZoneScore, Double plaqueZoneScore) {
        if (calculusZoneScore == null && plaqueZoneScore == null) {
            return null;
        }

        double damage = 0.0;
        if (calculusZoneScore != null) {
            damage += CALCULUS_SEVERITY_WEIGHT * (100.0 - calculusZoneScore);
        }
        if (plaqueZoneScore != null) {
            damage += PLAQUE_SEVERITY_WEIGHT * (100.0 - plaqueZoneScore);
        }

        return round1(Math.max(0.0, 100.0 - damage));
    }

    /**
     * 구역별 (병변 타입 → zoneScore) 를 {@link #combineZoneScore} 로 합쳐
     * 세션 점수 계산에 바로 넣을 수 있는 형태로 만든다.
     *
     * @return 합성 점수가 있는 구역만. 점수가 없는 구역은 키 자체가 빠진다(= 무효 구역).
     */
    public static Map<ViewType, Double> combineZoneScores(
            Map<ViewType, Map<LesionType, Double>> zoneScoresByLesion
    ) {
        Map<ViewType, Double> combined = new LinkedHashMap<>();
        if (zoneScoresByLesion == null) {
            return combined;
        }

        zoneScoresByLesion.forEach((zone, byLesion) -> {
            Double score = combineZoneScore(
                    byLesion.get(LesionType.CALCULUS),
                    byLesion.get(LesionType.PLAQUE)
            );
            if (score != null) {
                combined.put(zone, score);
            }
        });

        return combined;
    }

    /**
     * 저장된 분석 결과들을 구역 단위로 합친다.

     */
    public static Map<ViewType, Double> combineZoneScores(List<AnalysisResult> results) {
        return combineZoneScores(zoneScoresByLesion(results));
    }

    /**
     * 저장된 분석 결과들을 구역 → (병변 타입 → zoneScore) 로 묶는다.
     * 구역 리포트처럼 치석 점수·치태 점수를 따로 보여줘야 할 때 쓴다.
     */
    public static Map<ViewType, Map<LesionType, Double>> zoneScoresByLesion(List<AnalysisResult> results) {
        Map<ViewType, Map<LesionType, Double>> byZone = new LinkedHashMap<>();
        if (results == null) {
            return byZone;
        }

        for (AnalysisResult result : results) {
            if (result.getZoneScore() == null || result.getViewType() == null) {
                continue;
            }
            byZone.computeIfAbsent(result.getViewType(), k -> new EnumMap<>(LesionType.class))
                    .merge(measuredLesionType(result), result.getZoneScore(), Math::min);
        }

        return byZone;
    }

    /**
     * 저장된 분석 결과들로 세션 점수(구역 단순 평균)를 낸다.
     
     * @return 유효 구역이 하나도 없으면 null
     */
    public static Double sessionScore(List<AnalysisResult> results) {
        return sessionScore(combineZoneScores(results));
    }

    /**
     * {@link #sessionScore(List)} 의 API 노출용 정수. 유효 구역이 없으면 0.
     * 점수는 내부에서 소수 1자리로 계산하지만 화면에는 정수만 보여주기로 해서(기획 확정) 응답 직전에 반올림한다.
     */
    public static int sessionScoreOrZero(List<AnalysisResult> results) {
        Double score = sessionScore(results);
        return score == null ? 0 : (int) Math.round(score);
    }

    /** 응답 직전 반올림. null(무효 구역 등)은 그대로 null. */
    public static Integer roundScore(Double score) {
        return score == null ? null : (int) Math.round(score);
    }

    /** 이미지의 광원 → 그 이미지가 측정한 병변 타입. 광원 정보가 없으면 기존 동작대로 치석. */
    public static LesionType measuredLesionType(AnalysisResult result) {
        ScanImage scanImage = result.getScanImage();
        LightType lightType = scanImage == null ? null : scanImage.getLightType();
        return lightType == LightType.UV_LIGHT ? LesionType.PLAQUE : LesionType.CALCULUS;
    }

    /**
     * 세션 점수 = 촬영한 구역들의 zoneScore 를 <b>단순 평균</b> 한 값.
     * @param zoneScores viewType → zoneScore. null 인 무효 구역은 넣지 말 것.
     * @return 유효 구역이 하나도 없으면 null
     */
    public static Double sessionScore(Map<ViewType, Double> zoneScores) {
        if (zoneScores == null || zoneScores.isEmpty()) {
            return null;
        }

        double sum = 0.0;
        int count = 0;
        for (Double zoneScore : zoneScores.values()) {
            if (zoneScore == null) {
                continue;
            }
            sum += zoneScore;
            count++;
        }

        if (count == 0) {
            return null;
        }
        return round1(sum / count);
    }

    /** 점수·점수 차이의 공통 반올림(소수 1자리). 조회 API 가 scoreDiff 를 만들 때도 이걸 쓴다. */
    public static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
