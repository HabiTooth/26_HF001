package com.habitooth.backend.domain.ai.service;

import com.habitooth.backend.domain.ai.dto.response.PolygonPoint;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ToothLocalCoordinateMapper {

    /**
     * 사진이 모델 기준으로 좌우 반전돼 찍히는 구역.
     */
    private static final Set<ViewType> MIRRORED_ZONES = EnumSet.of(
            ViewType.UPPER_RIGHT_MOLAR,
            ViewType.UPPER_RIGHT_PREMOLAR,
            ViewType.UPPER_FRONT,
            ViewType.UPPER_LEFT_PREMOLAR,
            ViewType.UPPER_LEFT_MOLAR,
            ViewType.OUTER_RIGHT,
            ViewType.OUTER_CENTER,
            ViewType.OUTER_LEFT
    );

    private static final Set<ViewType> OUTER_ZONES = EnumSet.of(
            ViewType.OUTER_RIGHT,
            ViewType.OUTER_CENTER,
            ViewType.OUTER_LEFT
    );

    /** 치아 bbox. 모두 사진 기준 0~1 정규화 값. */
    public record Bbox(double x, double y, double w, double h) {
    }

    /** 치아 polygon(사진 기준 0~1)의 bbox. 점이 없거나 넓이가 0 이면 null. */
    public static Bbox bboxOf(List<PolygonPoint> toothPolygon) {
        if (toothPolygon == null || toothPolygon.isEmpty()) {
            return null;
        }

        double minX = Double.MAX_VALUE;
        double minY = Double.MAX_VALUE;
        double maxX = -Double.MAX_VALUE;
        double maxY = -Double.MAX_VALUE;
        for (PolygonPoint p : toothPolygon) {
            minX = Math.min(minX, p.getX());
            minY = Math.min(minY, p.getY());
            maxX = Math.max(maxX, p.getX());
            maxY = Math.max(maxY, p.getY());
        }

        double w = maxX - minX;
        double h = maxY - minY;
        if (w <= 0 || h <= 0) {
            return null;
        }
        return new Bbox(minX, minY, w, h);
    }

    /**
     * 병변 polygon(사진 기준 0~1) → 치아 bbox 기준 (u, v).
     * 병변이 치아 마스크 밖으로 살짝 삐져나온 점은 0~1 로 clamp 한다. 소수 3자리.
     */
    public static List<PolygonPoint> toToothLocal(List<PolygonPoint> lesionPolygon, Bbox bbox) {
        if (lesionPolygon == null || lesionPolygon.isEmpty() || bbox == null) {
            return List.of();
        }

        return lesionPolygon.stream()
                .map(p -> PolygonPoint.builder()
                        .x(round3(clamp01((p.getX() - bbox.x()) / bbox.w())))
                        .y(round3(clamp01((p.getY() - bbox.y()) / bbox.h())))
                        .build())
                .toList();
    }

    public static boolean isMirrored(ViewType viewType) {
        return viewType != null && MIRRORED_ZONES.contains(viewType);
    }

    /** 외측 3구역은 OUTER(순측/협측면), 설측 10구역은 INNER(설측면). */
    public static SurfaceType surfaceTypeOf(ViewType viewType) {
        return viewType != null && OUTER_ZONES.contains(viewType) ? SurfaceType.OUTER : SurfaceType.INNER;
    }

    /** {@link #surfaceTypeOf} 의 역방향: 표면 → 그 표면을 찍는 구역 집합. 치아 면별 추이 조회에 쓴다. */
    public static Set<ViewType> zonesOf(SurfaceType surfaceType) {
        EnumSet<ViewType> outer = EnumSet.copyOf(OUTER_ZONES);
        return surfaceType == SurfaceType.OUTER ? outer : EnumSet.complementOf(outer);
    }

    /** 반전 구역이면 u → 1 - u. v 는 그대로. */
    public static double mirrorU(double u, ViewType viewType) {
        return isMirrored(viewType) ? round3(1.0 - u) : u;
    }

    private static double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private static double round3(double value) {
        return Math.round(value * 1000) / 1000.0;
    }
}
