package com.habitooth.backend.domain.common.type;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "촬영 구역 타입 (설측 10구역 + 외측 3구역 = 13구역)")
public enum ViewType {

    // 설측 상악 5구역 (환자 기준 우 → 좌)
    UPPER_RIGHT_MOLAR,    // 상악 우측 대구치
    UPPER_RIGHT_PREMOLAR, // 상악 우측 소구치
    UPPER_FRONT,          // 상악 전치부
    UPPER_LEFT_PREMOLAR,  // 상악 좌측 소구치
    UPPER_LEFT_MOLAR,     // 상악 좌측 대구치

    // 설측 하악 5구역 (환자 기준 우 → 좌)
    LOWER_RIGHT_MOLAR,    // 하악 우측 대구치
    LOWER_RIGHT_PREMOLAR, // 하악 우측 소구치
    LOWER_FRONT,          // 하악 전치부
    LOWER_LEFT_PREMOLAR,  // 하악 좌측 소구치
    LOWER_LEFT_MOLAR,     // 하악 좌측 대구치

    // 외측 3구역 (환자 기준 우 → 좌)
    OUTER_RIGHT,          // 외측 우
    OUTER_CENTER,         // 외측 중앙
    OUTER_LEFT,           // 외측 좌
}
