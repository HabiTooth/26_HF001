package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class EeveRiskDetailItem {

    private String title;
    private String detail;
    private String riskLevel;
}
