package com.habitooth.backend.domain.ai.service;

import com.habitooth.backend.domain.ai.dto.response.PolygonPoint;
import com.habitooth.backend.domain.ai.service.ToothLocalCoordinateMapper.Bbox;
import com.habitooth.backend.domain.common.type.SurfaceType;
import com.habitooth.backend.domain.common.type.ViewType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ToothLocalCoordinateMapper - 사진 기준 → 치아 bbox 기준 좌표")
class ToothLocalCoordinateMapperTest {

    private static PolygonPoint pt(double x, double y) {
        return PolygonPoint.builder().x(x).y(y).build();
    }

    @Test
    @DisplayName("치아 polygon 의 min/max 로 bbox 를 만든다")
    void bboxOf() {
        Bbox bbox = ToothLocalCoordinateMapper.bboxOf(List.of(pt(0.3, 0.6), pt(0.5, 0.4), pt(0.4, 0.8)));

        assertThat(bbox).isEqualTo(new Bbox(0.3, 0.4, 0.2, 0.4));
    }

    @Test
    @DisplayName("점이 없거나 넓이가 0 인 치아 polygon 은 bbox 가 없다")
    void bboxOf_degenerate() {
        assertThat(ToothLocalCoordinateMapper.bboxOf(null)).isNull();
        assertThat(ToothLocalCoordinateMapper.bboxOf(List.of())).isNull();
        assertThat(ToothLocalCoordinateMapper.bboxOf(List.of(pt(0.3, 0.4), pt(0.3, 0.9)))).isNull();
    }

    @Test
    @DisplayName("병변 점을 치아 bbox 안 상대 위치(0~1)로 옮기고 소수 3자리로 반올림한다")
    void toToothLocal() {
        Bbox bbox = new Bbox(0.2, 0.4, 0.4, 0.3);

        List<PolygonPoint> local = ToothLocalCoordinateMapper.toToothLocal(
                List.of(pt(0.2, 0.4), pt(0.6, 0.7), pt(0.3, 0.5)), bbox);

        assertThat(local).extracting(PolygonPoint::getX, PolygonPoint::getY)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(0.0, 0.0),
                        org.assertj.core.groups.Tuple.tuple(1.0, 1.0),
                        org.assertj.core.groups.Tuple.tuple(0.25, 0.333));
    }

    @Test
    @DisplayName("치아 마스크 밖으로 삐져나온 점은 0~1 로 clamp 한다")
    void toToothLocal_clamps() {
        Bbox bbox = new Bbox(0.2, 0.4, 0.4, 0.3);

        List<PolygonPoint> local = ToothLocalCoordinateMapper.toToothLocal(List.of(pt(0.1, 0.9)), bbox);

        assertThat(local).singleElement().satisfies(p -> {
            assertThat(p.getX()).isEqualTo(0.0);
            assertThat(p.getY()).isEqualTo(1.0);
        });
    }

    @Test
    @DisplayName("bbox 가 없으면 빈 polygon")
    void toToothLocal_withoutBbox() {
        assertThat(ToothLocalCoordinateMapper.toToothLocal(List.of(pt(0.5, 0.5)), null)).isEmpty();
    }

    @Test
    @DisplayName("상악 설측 5구역과 외측 3구역만 좌우 반전, 하악 설측 5구역은 비반전")
    void isMirrored() {
        assertThat(ViewType.values()).filteredOn(ToothLocalCoordinateMapper::isMirrored)
                .containsExactlyInAnyOrder(
                        ViewType.UPPER_RIGHT_MOLAR, ViewType.UPPER_RIGHT_PREMOLAR, ViewType.UPPER_FRONT,
                        ViewType.UPPER_LEFT_PREMOLAR, ViewType.UPPER_LEFT_MOLAR,
                        ViewType.OUTER_RIGHT, ViewType.OUTER_CENTER, ViewType.OUTER_LEFT);
    }

    @Test
    @DisplayName("반전 구역은 u → 1 - u, 비반전 구역은 그대로")
    void mirrorU() {
        assertThat(ToothLocalCoordinateMapper.mirrorU(0.2, ViewType.UPPER_FRONT)).isEqualTo(0.8);
        assertThat(ToothLocalCoordinateMapper.mirrorU(0.2, ViewType.OUTER_LEFT)).isEqualTo(0.8);
        assertThat(ToothLocalCoordinateMapper.mirrorU(0.2, ViewType.LOWER_FRONT)).isEqualTo(0.2);
    }

    @Test
    @DisplayName("외측 3구역은 OUTER, 설측 10구역은 INNER")
    void surfaceTypeOf() {
        assertThat(ViewType.values()).filteredOn(v -> ToothLocalCoordinateMapper.surfaceTypeOf(v) == SurfaceType.OUTER)
                .containsExactlyInAnyOrder(ViewType.OUTER_RIGHT, ViewType.OUTER_CENTER, ViewType.OUTER_LEFT);
        assertThat(ToothLocalCoordinateMapper.surfaceTypeOf(ViewType.LOWER_LEFT_MOLAR)).isEqualTo(SurfaceType.INNER);
    }
}
