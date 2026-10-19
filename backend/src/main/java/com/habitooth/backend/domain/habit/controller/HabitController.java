package com.habitooth.backend.domain.habit.controller;

import com.habitooth.backend.domain.habit.dto.request.HabitUpdateRequest;
import com.habitooth.backend.domain.habit.dto.response.HabitDayLog;
import com.habitooth.backend.domain.habit.dto.response.HabitLogListResponse;
import com.habitooth.backend.domain.habit.service.HabitService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/habits")
@RequiredArgsConstructor
@Tag(name = "Habit API", description = "구강 습관 기록 API")
@SecurityRequirement(name = "bearerAuth")
public class HabitController {

    private final HabitService habitService;

    @Operation(
            summary = "기간별 습관 기록 조회",
            description = "from~to 기간(양 끝 포함, 최대 366일)의 날짜별 습관 달성 목록을 날짜 오름차순으로 반환합니다. " +
                    "습관이 하나도 없는 날짜는 응답에 포함되지 않습니다."
    )
    @GetMapping
    public ApiResponse<HabitLogListResponse> getHabits(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "조회 시작일(ISO)", example = "2026-08-01")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "조회 종료일(ISO)", example = "2026-08-31")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.success(habitService.getHabits(userDetails.getUserId(), from, to));
    }

    @Operation(
            summary = "특정 날짜 습관 기록 덮어쓰기",
            description = "해당 날짜의 습관 기록을 요청 배열로 통째로 덮어씁니다(토글 단위 X). " +
                    "빈 배열이면 그 날짜 기록이 삭제됩니다. 미래 날짜(Asia/Seoul 기준)는 거절됩니다. " +
                    "응답은 저장된 정규화 상태입니다."
    )
    @PutMapping("/{date}")
    public ApiResponse<HabitDayLog> updateHabits(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "기록 날짜(ISO)", example = "2026-08-30")
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody @Valid HabitUpdateRequest request
    ) {
        return ApiResponse.success(habitService.updateHabits(userDetails.getUserId(), date, request.habits()));
    }
}
