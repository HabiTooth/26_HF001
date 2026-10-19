package com.habitooth.backend.domain.history.dto.response;

import com.habitooth.backend.domain.common.type.RiskLevel;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Builder
public class HistoryRecordItem {
    private Long sessionId;
    private LocalDate date;
    private LocalTime time;
    private Integer score;
    private RiskLevel riskLevel;
}
