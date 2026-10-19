package com.habitooth.backend.domain.scan.repository;

import com.habitooth.backend.domain.scan.entity.ScanSession;
import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScanSessionRepository extends JpaRepository<ScanSession, Long> {
        List<ScanSession> findByUserIdAndDeletedAtIsNullOrderByStartedAtDesc(Long userId);

        List<ScanSession> findByUserIdAndStatusAndDeletedAtIsNull(Long userId, ScanSessionStatus status);

        Optional<ScanSession> findFirstByUserIdAndStatusAndDeletedAtIsNullOrderByStartedAtDesc(Long userId, ScanSessionStatus status);

        Optional<ScanSession> findFirstByUserIdAndStatusAndDeletedAtIsNullAndStartedAtBeforeOrderByStartedAtDesc(
                Long userId, ScanSessionStatus status, LocalDateTime startedAt);

        List<ScanSession> findTop2ByUserIdAndStatusAndDeletedAtIsNullOrderByStartedAtDesc(Long userId, ScanSessionStatus status);

        @Query("SELECT s FROM ScanSession s WHERE s.userId = :userId AND s.status = :status AND s.deletedAt IS NULL " +
                "AND (:since IS NULL OR s.startedAt >= :since) ORDER BY s.startedAt DESC")
        List<ScanSession> findAllByUserIdAndStatusAndPeriod(@Param("userId") Long userId,
                                                                @Param("status") ScanSessionStatus status,
                                                                @Param("since") LocalDateTime since);

        @Modifying
        @Query("UPDATE ScanSession s SET s.deletedAt = :now WHERE s.userId = :userId AND s.deletedAt IS NULL")
        void softDeleteAllByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

        List<ScanSession> findAllByStatusInAndCreatedAtBefore(List<ScanSessionStatus> statuses, LocalDateTime threshold);

        Optional<ScanSession> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);

        /** SCAN_REMINDER 스케줄러용: 사용자별 마지막 COMPLETED 세션 시작 시각. */
        @Query("""
                SELECT s.userId AS userId, MAX(s.startedAt) AS lastStartedAt
                FROM ScanSession s
                WHERE s.status = com.habitooth.backend.domain.common.type.ScanSessionStatus.COMPLETED
                  AND s.deletedAt IS NULL
                GROUP BY s.userId
                """)
        List<LastCompletedScan> findLastCompletedScanPerUser();

        /** STREAK 계산용: 사용자의 COMPLETED 세션이 존재한 날짜(중복 제거, 최신순). */
        @Query(value = """
                SELECT DISTINCT DATE(started_at)
                FROM scan_session
                WHERE user_id = :userId
                  AND status = 'COMPLETED'
                  AND deleted_at IS NULL
                ORDER BY 1 DESC
                LIMIT 150
                """, nativeQuery = true)
        List<java.sql.Date> findRecentCompletedDatesDesc(@Param("userId") Long userId);

        interface LastCompletedScan {
                Long getUserId();
                LocalDateTime getLastStartedAt();
        }
}