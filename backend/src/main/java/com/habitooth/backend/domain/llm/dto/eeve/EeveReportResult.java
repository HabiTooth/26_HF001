package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class EeveReportResult {

    private List<EeveRiskDetailItem> riskDetail;
    private List<EeveManagementItem> management;
    private String disclaimer;
}
