package com.habitooth.backend.domain.history.dto;

import java.time.LocalDateTime;

public enum HistoryPeriodFilter {
    ALL,
    ONE_MONTH,
    THREE_MONTHS,
    SIX_MONTHS;

    public LocalDateTime toSince(LocalDateTime now) {
        return switch (this) {
            case ALL -> null;
            case ONE_MONTH -> now.minusMonths(1);
            case THREE_MONTHS -> now.minusMonths(3);
            case SIX_MONTHS -> now.minusMonths(6);
        };
    }
}
