package com.habitooth.backend.domain.habit.entity;

import com.habitooth.backend.domain.habit.type.HabitType;
import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 사용자별·날짜별 습관 달성 기록. 달성한 습관 1건당 1행이며,
 * {@code (user_id, log_date, habit_type)} 유니크 제약으로 중복을 막는다.
 * 특정 날짜 갱신은 해당 날짜 행 전체 삭제 후 재삽입(덮어쓰기) 방식이다.
 */
@Entity
@Getter
@Table(name = "habit_log")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class HabitLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "habit_log_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "habit_type", nullable = false, length = 30)
    private HabitType habitType;

    public static HabitLog of(Long userId, LocalDate logDate, HabitType habitType) {
        return HabitLog.builder()
                .userId(userId)
                .logDate(logDate)
                .habitType(habitType)
                .build();
    }
}
