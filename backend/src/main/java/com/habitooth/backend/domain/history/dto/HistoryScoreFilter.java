package com.habitooth.backend.domain.history.dto;

public enum HistoryScoreFilter {
    ALL,
    HIGH,   // 80점 이상
    MEDIUM, // 70~79점
    LOW;    // 70점 미만

    public boolean matches(int score) {
        return switch (this) {
            case ALL -> true;
            case HIGH -> score >= 80;
            case MEDIUM -> score >= 70 && score < 80;
            case LOW -> score < 70;
        };
    }
}
