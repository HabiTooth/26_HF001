package com.habitooth.backend.domain.habit.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * 기간별 습관 기록 조회 응답. 습관이 하나도 없는 날짜는 포함되지 않으며, 날짜 오름차순이다.
 */
public record HabitLogListResponse(

        @Schema(description = "날짜별 습관 기록 목록 (날짜 오름차순)")
        List<HabitDayLog> logs
) {
}
