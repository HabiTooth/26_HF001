package com.habitooth.backend.domain.ai.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiTaskResultResponse {
    @JsonProperty("isSuccess")
    private Boolean isSuccess;

    private String message;

    private FastApiTaskResult result;
}