package com.habitooth.backend.domain.habit.service;

import com.habitooth.backend.domain.habit.dto.response.HabitDayLog;
import com.habitooth.backend.domain.habit.dto.response.HabitLogListResponse;
import com.habitooth.backend.domain.habit.entity.HabitLog;
import com.habitooth.backend.domain.habit.repository.HabitLogRepository;
import com.habitooth.backend.domain.habit.type.HabitType;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.HabitHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HabitService {

    /** "미래 날짜" 판정 기준 타임존. 앱이 한국 전용이므로 서버 시간과 무관하게 KST로 고정한다. */
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    /** GET 조회 기간 상한(양 끝 포함). */
    private static final long MAX_RANGE_DAYS = 366;

    private final HabitLogRepository habitLogRepository;

    public HabitLogListResponse getHabits(Long userId, LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new HabitHandler(ErrorCode.HABIT_INVALID_DATE_RANGE);
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_RANGE_DAYS) {
            throw new HabitHandler(ErrorCode.HABIT_RANGE_TOO_LARGE);
        }

        Map<LocalDate, List<HabitType>> byDate = new LinkedHashMap<>();
        for (HabitLog log : habitLogRepository
                .findByUserIdAndLogDateBetweenOrderByLogDateAscHabitTypeAsc(userId, from, to)) {
            byDate.computeIfAbsent(log.getLogDate(), d -> new ArrayList<>()).add(log.getHabitType());
        }

        List<HabitDayLog> logs = byDate.entrySet().stream()
                .map(e -> new HabitDayLog(e.getKey(), normalize(e.getValue())))
                .toList();

        return new HabitLogListResponse(logs);
    }

    @Transactional
    public HabitDayLog updateHabits(Long userId, LocalDate date, List<HabitType> habits) {
        if (date == null) {
            throw new HabitHandler(ErrorCode.HABIT_INVALID_DATE_RANGE);
        }
        if (date.isAfter(LocalDate.now(KST))) {
            throw new HabitHandler(ErrorCode.HABIT_FUTURE_DATE);
        }

        List<HabitType> normalized = normalize(habits == null ? List.of() : habits);

        // 덮어쓰기: 해당 날짜 기록을 통째로 지우고 결과 배열만 다시 저장한다.
        habitLogRepository.deleteByUserIdAndLogDate(userId, date);
        for (HabitType type : normalized) {
            habitLogRepository.save(HabitLog.of(userId, date, type));
        }

        return new HabitDayLog(date, normalized);
    }

    /** null·중복 제거 후 enum 선언 순서로 정렬. */
    private List<HabitType> normalize(List<HabitType> habits) {
        return habits.stream()
                .filter(Objects::nonNull)
                .distinct()
                .sorted(Comparator.comparingInt(Enum::ordinal))
                .toList();
    }
}
