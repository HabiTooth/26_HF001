package com.habitooth.backend.domain.ai.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** POST /api/ai/predict/plaque-fluorescence 응답. */
@Getter
@NoArgsConstructor
public class FastApiPlaqueFluorescenceResponse {
    @JsonProperty("isSuccess")
    private Boolean isSuccess;
    private String message;
    private Double totalFluorescencePlaqueRatio;
    private List<FastApiFluorescenceToothStatus> toothStatuses;
    private FastApiCalculusCrossCheck calculusCrossCheck;
}
