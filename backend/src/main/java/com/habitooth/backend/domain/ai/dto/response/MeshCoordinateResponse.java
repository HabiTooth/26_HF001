package com.habitooth.backend.domain.ai.dto.response;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.SurfaceType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 3D 구강 모델 오버레이용 병변 좌표
 */
@Getter
@AllArgsConstructor
@Schema(description = "3D 오버레이용 병변 좌표 (치아 bbox 기준 정규화)")
public class MeshCoordinateResponse {

    @Schema(description = "촬영 세션 ID", example = "127")
    private Long sessionId;

    @Schema(description = "치아에 매핑된 병변 목록. 치아 번호가 없는 병변은 제외")
    private List<Lesion> lesions;

    @Getter
    @AllArgsConstructor
    @Schema(description = "치아 단위 병변")
    public static class Lesion {

        @Schema(description = "치아 FDI 번호 (사랑니 포함)", example = "31")
        private Integer toothNumber;

        @Schema(description = "병변이 올라갈 치아 표면. 외측 3구역은 OUTER, 설측 10구역은 INNER", example = "INNER")
        private SurfaceType surfaceType;

        @Schema(description = "병변 종류", example = "PLAQUE")
        private LesionType lesionType;

        @Schema(description = "치아 bbox 기준 0~1 좌표. 원점은 모델 기준 왼쪽 위 (좌우 반전 적용 완료)")
        private List<ToothLocalPoint> polygon;
    }

    @Getter
    @AllArgsConstructor
    @Schema(description = "치아 bbox 기준 좌표")
    public static class ToothLocalPoint {

        @Schema(description = "가로 위치 (0=치아 왼쪽, 1=오른쪽)", example = "0.12")
        private Double u;

        @Schema(description = "세로 위치 (0=치아 위, 1=아래)", example = "0.58")
        private Double v;
    }
}
