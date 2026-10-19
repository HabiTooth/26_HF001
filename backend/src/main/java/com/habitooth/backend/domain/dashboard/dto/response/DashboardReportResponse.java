package com.habitooth.backend.domain.dashboard.dto.response;

import com.habitooth.backend.domain.common.type.RiskLevel;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DashboardReportResponse {
    private Long sessionId;
    private LocalDateTime scannedAt;
    private Integer averageScore;  // 세션 종합 점수(정수). 유효 구역이 없으면 0
    private RiskLevel plaqueRiskLevel;
    private RiskLevel calculusRiskLevel;
}
