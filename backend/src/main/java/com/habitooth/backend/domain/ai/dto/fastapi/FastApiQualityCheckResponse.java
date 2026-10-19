package com.habitooth.backend.domain.ai.dto.fastapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * POST /api/ai/capture/quality-check 원시 응답. 응답은 camelCase 로 오므로
 * 별도 네이밍 전략 없이 필드명이 그대로 매핑된다.
 * isSuccess 는 FastAPI 자체 성공 여부이며, Spring 의 ApiResponse 래퍼와는 무관하다.
 */
@Getter
@NoArgsConstructor
public class FastApiQualityCheckResponse {
    @JsonProperty("isSuccess")
    private Boolean isSuccess;
    @JsonProperty("needsRetake")
    private Boolean needsRetake;
    private String reason;
    private String message;
    private FastApiQualityDetail detail;
}
