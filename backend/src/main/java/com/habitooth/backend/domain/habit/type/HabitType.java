package com.habitooth.backend.domain.habit.type;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 구강 습관 유형. FE {@code src/lib/habits.ts} 의 {@code HABITS} 와 이름/개수가 정확히 일치해야 하며,
 * 항목 추가/변경 시 FE·BE 동시 배포가 필요하다.
 * enum 선언 순서 = 응답 정규화 순서(아침→점심→저녁 양치→치실→가글).
 */
@Schema(description = "구강 습관 유형")
public enum HabitType {
    BRUSH_MORNING,
    BRUSH_NOON,
    BRUSH_NIGHT,
    FLOSS,
    MOUTHWASH
}
