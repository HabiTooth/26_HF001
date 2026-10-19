package com.habitooth.backend.domain.scan.dto;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class ToothSummary {
    private Integer toothNumber;
    private Double riskScore;
    private Integer issueCount;
}
