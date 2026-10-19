package com.habitooth.backend.domain.common.type;

import lombok.Getter;

@Getter
public enum LesionType {
    PLAQUE("치태"),
    CALCULUS("치석");

    /** 사용자 노출용 한국어 라벨 (알림 문구 등). */
    private final String label;

    LesionType(String label) {
        this.label = label;
    }
}
