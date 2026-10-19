package com.habitooth.backend.domain.habit.dto.response;

import com.habitooth.backend.domain.habit.type.HabitType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.util.List;

/**
 * 하루치 습관 기록. {@code habits} 는 enum 선언 순서로 정규화된다.
 */
public record HabitDayLog(

        @Schema(description = "기록 날짜", example = "2026-08-30")
        LocalDate date,

        @Schema(description = "그 날짜에 달성한 습관 목록", example = "[\"BRUSH_MORNING\", \"FLOSS\"]")
        List<HabitType> habits
) {
}
