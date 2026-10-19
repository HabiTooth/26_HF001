package com.habitooth.backend.domain.history.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
@Schema(description = "구역 점수 추이 1점 (측정일 1개 = 점 1개)")
public class ZoneScoreTrendItem {

    @Schema(description = "촬영 세션 ID", example = "127")
    private Long sessionId;

    @Schema(description = "측정일", example = "2026-10-15")
    private LocalDate date;

    @Schema(description = "구역 점수(치석·치태 합성), 정수", example = "83")
    private Integer zoneScore;

    @Schema(description = "백색광(치석) 구역 점수, 정수. 그 세션에서 백색광을 안 찍었으면 null", example = "85", nullable = true)
    private Integer calculusZoneScore;

    @Schema(description = "UV(치태) 구역 점수, 정수. 그 세션에서 UV 를 안 찍었으면 null", example = "96", nullable = true)
    private Integer plaqueZoneScore;
}
