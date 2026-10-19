package com.habitooth.backend.domain.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@Schema(description = "polygon 좌표")
public class PolygonPoint {

    @Schema(description = "x 좌표", example = "120")
    private Double x;

    @Schema(description = "y 좌표", example = "230")
    private Double y;
}