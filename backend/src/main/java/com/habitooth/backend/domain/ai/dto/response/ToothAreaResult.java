package com.habitooth.backend.domain.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "치아 영역 세그멘테이션 결과")
public class ToothAreaResult {

    @Schema(description = "FastAPI가 반환한 치아 영역 ID", example = "1")
    private Integer areaId;

    @Schema(
            description = "치아 FDI 번호, 현재는 임시 인덱스",
            example = "1",
            nullable = true
    )
    private Integer toothNumber;

    @Schema(
            description = "3D 치아 템플릿 매핑 ID",
            example = "tooth_11",
            nullable = true
    )
    private String templateRegionId;

    @Schema(description = "치아 영역 polygon 좌표")
    private List<PolygonPoint> polygon;

    public void updatePolygon(List<PolygonPoint> normalizedPolygon) {
        this.polygon = normalizedPolygon;
    }
}
