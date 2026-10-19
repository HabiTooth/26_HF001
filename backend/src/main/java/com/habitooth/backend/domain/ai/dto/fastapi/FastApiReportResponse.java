package com.habitooth.backend.domain.ai.dto.fastapi;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiReportResponse {
    private String code;
    private String message;
    private Boolean success;
    private FastApiResultData result;
}