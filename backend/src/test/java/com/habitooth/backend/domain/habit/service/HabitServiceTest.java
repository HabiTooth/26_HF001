package com.habitooth.backend.domain.habit.service;

import com.habitooth.backend.domain.habit.dto.response.HabitDayLog;
import com.habitooth.backend.domain.habit.dto.response.HabitLogListResponse;
import com.habitooth.backend.domain.habit.entity.HabitLog;
import com.habitooth.backend.domain.habit.repository.HabitLogRepository;
import com.habitooth.backend.domain.habit.type.HabitType;
import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.HabitHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HabitServiceTest {

    private static final long USER_ID = 1L;

    @Mock
    private HabitLogRepository habitLogRepository;

    @InjectMocks
    private HabitService habitService;

    @Test
    @DisplayName("기간 조회 - 날짜별로 묶고 enum 선언 순서로 정규화, 습관 없는 날짜는 제외")
    void getHabits_groupsByDateAndNormalizes() {
        LocalDate d1 = LocalDate.of(2026, 8, 10);
        LocalDate d2 = LocalDate.of(2026, 8, 12);
        when(habitLogRepository.findByUserIdAndLogDateBetweenOrderByLogDateAscHabitTypeAsc(
                eq(USER_ID), any(), any()))
                .thenReturn(List.of(
                        HabitLog.of(USER_ID, d1, HabitType.FLOSS),
                        HabitLog.of(USER_ID, d1, HabitType.BRUSH_MORNING),
                        HabitLog.of(USER_ID, d2, HabitType.MOUTHWASH)
                ));

        HabitLogListResponse response = habitService.getHabits(USER_ID, d1, d2);

        assertThat(response.logs()).hasSize(2);
        assertThat(response.logs().get(0).date()).isEqualTo(d1);
        assertThat(response.logs().get(0).habits())
                .containsExactly(HabitType.BRUSH_MORNING, HabitType.FLOSS);
        assertThat(response.logs().get(1).habits()).containsExactly(HabitType.MOUTHWASH);
    }

    @Test
    @DisplayName("기간 조회 - from이 to보다 뒤면 예외")
    void getHabits_invalidRange_throws() {
        assertThatThrownBy(() -> habitService.getHabits(
                USER_ID, LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 1)))
                .isInstanceOf(HabitHandler.class)
                .extracting("errorCode").isEqualTo(ErrorCode.HABIT_INVALID_DATE_RANGE);
    }

    @Test
    @DisplayName("기간 조회 - 366일 초과면 예외")
    void getHabits_rangeTooLarge_throws() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        assertThatThrownBy(() -> habitService.getHabits(USER_ID, from, from.plusDays(366)))
                .isInstanceOf(HabitHandler.class)
                .extracting("errorCode").isEqualTo(ErrorCode.HABIT_RANGE_TOO_LARGE);
    }

    @Test
    @DisplayName("기간 조회 - 정확히 366일이면 통과")
    void getHabits_exactly366Days_ok() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        when(habitLogRepository.findByUserIdAndLogDateBetweenOrderByLogDateAscHabitTypeAsc(
                anyLong(), any(), any())).thenReturn(List.of());

        habitService.getHabits(USER_ID, from, from.plusDays(365));

        verify(habitLogRepository).findByUserIdAndLogDateBetweenOrderByLogDateAscHabitTypeAsc(
                eq(USER_ID), eq(from), eq(from.plusDays(365)));
    }

    @Test
    @DisplayName("덮어쓰기 - 기존 날짜 삭제 후 중복 제거·정규화한 습관만 저장, 저장 상태 반환")
    void updateHabits_overwritesAndReturnsNormalized() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));

        HabitDayLog result = habitService.updateHabits(USER_ID, today,
                List.of(HabitType.FLOSS, HabitType.BRUSH_MORNING, HabitType.FLOSS));

        verify(habitLogRepository).deleteByUserIdAndLogDate(USER_ID, today);
        verify(habitLogRepository, times(2)).save(any(HabitLog.class));
        assertThat(result.date()).isEqualTo(today);
        assertThat(result.habits()).containsExactly(HabitType.BRUSH_MORNING, HabitType.FLOSS);
    }

    @Test
    @DisplayName("덮어쓰기 - 빈 배열이면 삭제만 하고 저장 없음, 빈 habits 반환")
    void updateHabits_emptyList_deletesOnly() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));

        HabitDayLog result = habitService.updateHabits(USER_ID, today, List.of());

        verify(habitLogRepository).deleteByUserIdAndLogDate(USER_ID, today);
        verify(habitLogRepository, never()).save(any(HabitLog.class));
        assertThat(result.habits()).isEmpty();
    }

    @Test
    @DisplayName("덮어쓰기 - 미래 날짜(KST 기준)는 예외")
    void updateHabits_futureDate_throws() {
        LocalDate future = LocalDate.now(ZoneId.of("Asia/Seoul")).plusDays(1);

        assertThatThrownBy(() -> habitService.updateHabits(USER_ID, future, List.of(HabitType.FLOSS)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.HABIT_FUTURE_DATE);

        verify(habitLogRepository, never()).deleteByUserIdAndLogDate(anyLong(), any());
        verify(habitLogRepository, never()).save(any(HabitLog.class));
    }
}
