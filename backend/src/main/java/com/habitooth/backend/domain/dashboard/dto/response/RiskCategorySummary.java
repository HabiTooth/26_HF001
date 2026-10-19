package com.habitooth.backend.domain.dashboard.dto.response;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RiskCategorySummary {
    private LesionType lesionType;     // PLAQUE / CALCULUS
    private RiskLevel riskLevel;
    private int affectedRatio;         // 영향받은 치아 비율 (0-100)
}
