package com.habitooth.backend.domain.dashboard.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DashboardRiskResponse {
    private Long sessionId;
    private List<RiskCategorySummary> categories;
}
