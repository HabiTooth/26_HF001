package com.habitooth.backend.domain.report.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "polygon 좌표 응답 DTO. 사진 기준이 아니라 해당 치아 bbox 기준 0~1 좌표")
public class ReportPolygonPoint {

    @Schema(description = "치아 bbox 기준 가로 위치 u (0~1)", example = "0.357")
    private Double x;

    @Schema(description = "치아 bbox 기준 세로 위치 v (0~1)", example = "0.106")
    private Double y;
}