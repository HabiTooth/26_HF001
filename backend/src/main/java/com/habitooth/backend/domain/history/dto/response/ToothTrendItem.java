package com.habitooth.backend.domain.history.dto.response;

import com.habitooth.backend.domain.common.type.RiskLevel;
import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
@Schema(description = "치아 1개·표면 1개·병변 1종의 면적비 추이 1점 (측정일 1개 = 점 1개)")
public class ToothTrendItem {

    @Schema(description = "촬영 세션 ID", example = "127")
    private Long sessionId;

    @Schema(description = "측정일", example = "2026-10-15")
    private LocalDate date;

    @Schema(description = "이 값을 낸 촬영 구역. 같은 표면의 두 구역에 걸친 치아는 면적비가 큰 쪽", example = "LOWER_FRONT")
    private ViewType viewType;

    @Schema(description = "치아 면적 대비 병변 면적 비율(%)", example = "12.1")
    private Double areaRatio;

    @Schema(description = "치아 점수 (100 − 3 × areaRatio), 정수", example = "64")
    private Integer toothScore;

    @Schema(description = "위험 단계", example = "HIGH")
    private RiskLevel riskLevel;
}
