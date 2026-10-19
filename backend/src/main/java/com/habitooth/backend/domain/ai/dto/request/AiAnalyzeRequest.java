package com.habitooth.backend.domain.ai.dto.request;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalyzeRequest {

    @NotNull(message = "scanImageId는 필수입니다.")
    @Schema(
            description = "분석할 촬영 이미지 ID",
            example = "1",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private Long scanImageId;

    @NotNull(message = "viewType은 필수입니다.")
    @Schema(
            description = "촬영 구역 타입",
            example = "UPPER_FRONT",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private ViewType viewType;

    @NotNull(message = "lightType은 필수입니다.")
    @Schema(
            description = "촬영 광원 타입",
            example = "WHITE_LIGHT",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private LightType lightType;
}
