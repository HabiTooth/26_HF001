package com.habitooth.backend.domain.history.dto.response;

import com.habitooth.backend.domain.common.type.RiskLevel;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class HistoryListItem {
    private Long sessionId;
    private LocalDate date;
    private Integer score;
    private RiskLevel plaqueRiskLevel;
    private RiskLevel calculusRiskLevel;
}
