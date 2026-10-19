package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class EeveReportResponse {

    private Boolean isSuccess;
    private String message;
    private EeveReportResult result;
}
