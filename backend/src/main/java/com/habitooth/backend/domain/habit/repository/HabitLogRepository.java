package com.habitooth.backend.domain.habit.repository;

import com.habitooth.backend.domain.habit.entity.HabitLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface HabitLogRepository extends JpaRepository<HabitLog, Long> {

    List<HabitLog> findByUserIdAndLogDateBetweenOrderByLogDateAscHabitTypeAsc(
            Long userId, LocalDate from, LocalDate to
    );

    /**
     * 특정 날짜의 기존 기록을 벌크 삭제한다. 덮어쓰기 재삽입 전에 즉시 실행돼
     * {@code (user_id, log_date, habit_type)} 유니크 충돌을 방지한다.
     */
    @Modifying
    @Query("DELETE FROM HabitLog h WHERE h.userId = :userId AND h.logDate = :logDate")
    void deleteByUserIdAndLogDate(@Param("userId") Long userId, @Param("logDate") LocalDate logDate);
}
