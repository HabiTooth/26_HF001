package com.habitooth.backend.domain.common.type;

import lombok.Getter;

@Getter
public enum RiskLevel {
    VERY_LOW("매우 낮음"),   // 거의 문제 없음
    LOW("낮음"),
    MEDIUM("주의 필요"),
    HIGH("위험"),
    CRITICAL("매우 위험");

    /** 사용자 노출용 한국어 라벨 (알림 문구 등). */
    private final String label;

    RiskLevel(String label) {
        this.label = label;
    }
}
