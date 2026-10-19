package com.habitooth.backend.domain.history.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class HistoryScoreTrendItem {
    private Long sessionId;
    private LocalDate date;
    private Integer score;
}
