package com.habitooth.backend.domain.report.dto.response;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "리포트 탐지 결과 응답 DTO")
public class ReportDetectedIssueResponse {

    @Schema(description = "치아 번호 또는 임시 탐지 인덱스", example = "1")
    private Integer toothNumber;

    @Schema(description = "3D 템플릿 region ID", example = "tooth_1")
    private String templateRegionId;

    @Schema(description = "병변 타입", example = "CALCULUS")
    private LesionType lesionType;

    @Schema(description = "탐지 신뢰도. UV 형광 기반 치태 영역은 신뢰도가 없어 null",
            example = "0.87", nullable = true)
    private Double confidence;

    @Schema(description = "위험도", example = "HIGH")
    private RiskLevel riskLevel;

    @Schema(description = "탐지 영역 polygon. 해당 치아 bbox 기준 0~1 좌표(좌우 반전 미적용). 치아 미매핑 병변은 빈 배열")
    private List<ReportPolygonPoint> polygon;
}