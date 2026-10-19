package com.habitooth.backend.domain.ai.dto.response;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "치태/치석 탐지 결과")
public class DetectedIssueResult {


    @Schema(
            description = "탐지 결과가 매핑된 치아 번호",
            example = "16",
            nullable = true
    )
    private Integer toothNumber;

    @Schema(
            description = "3D 치아 템플릿 매핑 ID",
            example = "tooth_16",
            nullable = true
    )
    private String templateRegionId;

    @Schema(description = "탐지 유형", example = "CALCULUS")
    private LesionType lesionType;

    @Schema(description = "탐지 confidence. UV 형광 기반 치태 영역은 신뢰도가 없어 null",
            example = "0.87", nullable = true)
    private Double confidence;

    @Schema(description = "위험 단계", example = "CAUTION")
    private RiskLevel riskLevel;

    @Schema(description = "탐지 영역 polygon 좌표")
    private List<PolygonPoint> polygon;

    public void updatePolygon(List<PolygonPoint> normalizedPolygon) {
        this.polygon = normalizedPolygon;
    }
}