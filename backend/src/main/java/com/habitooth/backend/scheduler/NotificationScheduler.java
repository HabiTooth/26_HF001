package com.habitooth.backend.scheduler;

import com.habitooth.backend.domain.notification.service.NotificationRules;
import com.habitooth.backend.domain.notification.service.NotificationService;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository.LastCompletedScan;
import com.habitooth.backend.domain.user.entity.User;
import com.habitooth.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * 알림 스케줄러. 하루 1회 09:00 KST.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final ScanSessionRepository scanSessionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /** 마지막 COMPLETED 세션이 3일 이상 지난 사용자에게 SCAN_REMINDER. dedupe_key 가 날짜 단위라 하루 1건. */
    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
    public void sendScanReminders() {
        LocalDate today = LocalDate.now(KST);
        LocalDateTime now = LocalDateTime.now(KST);
        int candidates = 0;

        for (LastCompletedScan row : scanSessionRepository.findLastCompletedScanPerUser()) {
            long days = ChronoUnit.DAYS.between(row.getLastStartedAt(), now);
            if (days < NotificationRules.REMIND_AFTER_DAYS) {
                continue;
            }
            candidates++;
            notificationService.create(row.getUserId(),
                    NotificationRules.scanReminder((int) days, today));
        }

        log.info("[SCAN_REMINDER] 스케줄러 실행 - 대상 후보 {}명", candidates);
    }

    /** 마지막 치과 방문일이 182일 이상 지난 사용자에게 CHECKUP. dedupe_key 가 월 단위라 한 달 1건. */
    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
    public void sendCheckupReminders() {
        LocalDate today = LocalDate.now(KST);
        LocalDate threshold = today.minusDays(NotificationRules.CHECKUP_INTERVAL_DAYS);
        int candidates = 0;

        for (User user : userRepository.findAllByLastDentalVisitAtIsNotNullAndLastDentalVisitAtLessThanEqual(threshold)) {
            int days = (int) ChronoUnit.DAYS.between(user.getLastDentalVisitAt(), today);
            candidates++;
            notificationService.create(user.getId(), NotificationRules.checkupDue(days, today));
        }

        log.info("[CHECKUP] 스케줄러 실행 - 대상 후보 {}명", candidates);
    }
}
