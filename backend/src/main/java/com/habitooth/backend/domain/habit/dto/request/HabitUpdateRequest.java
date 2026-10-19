package com.habitooth.backend.domain.habit.dto.request;

import com.habitooth.backend.domain.habit.type.HabitType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * 특정 날짜의 습관 기록 덮어쓰기 요청. 토글 단위가 아니라 그 날짜의 최종 결과를 통째로 보낸다.
 * 빈 배열이면 해당 날짜 기록이 삭제된다.
 */
public record HabitUpdateRequest(

        @Schema(description = "그 날짜에 달성한 습관 목록", example = "[\"BRUSH_MORNING\", \"FLOSS\"]")
        @NotNull
        List<HabitType> habits
) {
}
