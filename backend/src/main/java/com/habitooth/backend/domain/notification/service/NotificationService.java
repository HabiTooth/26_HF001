package com.habitooth.backend.domain.notification.service;

import com.habitooth.backend.domain.notification.dto.NotificationCommand;
import com.habitooth.backend.domain.notification.dto.response.NotificationResponse;
import com.habitooth.backend.domain.notification.entity.Notification;
import com.habitooth.backend.domain.notification.repository.NotificationRepository;
import com.habitooth.backend.domain.notification.type.NotificationType;
import com.habitooth.backend.domain.user.entity.User;
import com.habitooth.backend.domain.user.repository.UserRepository;
import com.habitooth.backend.global.error.ErrorCode;
import com.habitooth.backend.global.error.handler.NotificationHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    // ================== 생성 ==================

    /**
     * 알림 1건 생성. 사용자 설정과 dedupe_key 를 여기서 일괄 처리한다.
     * - pushNotificationEnabled=false → 생성 안 함
     * - REPORT_READY 인데 reportNotificationEnabled=false → 생성 안 함
     * - 같은 (user, dedupeKey) 가 이미 있으면 조용히 무시
     * 스케줄러/이벤트 리스너에서 호출되며, 각 호출이 독립 트랜잭션(REQUIRES_NEW)이라
     * 한 알림의 실패가 다른 알림 생성이나 호출 측 트랜잭션에 영향을 주지 않는다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void create(Long userId, NotificationCommand command) {
        if (command == null) {
            return;
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("알림 생성 스킵 - 사용자 없음 userId={}", userId);
            return;
        }
        if (!user.isPushNotificationEnabled()) {
            return;
        }
        if (command.type() == NotificationType.REPORT_READY && !user.isReportNotificationEnabled()) {
            return;
        }
        if (notificationRepository.existsByUserIdAndDedupeKey(userId, command.dedupeKey())) {
            return;
        }

        try {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .type(command.type())
                    .title(command.title())
                    .body(command.body())
                    .link(command.link())
                    .dedupeKey(command.dedupeKey())
                    .build());
        } catch (DataIntegrityViolationException e) {
            // 동시 생성 레이스 - 유니크 제약이 막아줌
            log.debug("알림 중복 생성 무시 userId={} dedupeKey={}", userId, command.dedupeKey());
        }
    }

    // ================== 조회 ==================

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(Long userId) {
        return notificationRepository.findTop50ByUserIdOrderByIdDesc(userId).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadIsFalse(userId);
    }

    // ================== 변경 ==================

    @Transactional
    public void markRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotificationHandler(ErrorCode.NOTIFICATION_NOT_FOUND));
        notification.markRead();
    }

    @Transactional
    public int markAllRead(Long userId) {
        return notificationRepository.markAllReadByUserId(userId);
    }

    @Transactional
    public void delete(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotificationHandler(ErrorCode.NOTIFICATION_NOT_FOUND));
        notificationRepository.delete(notification);
    }

    @Transactional
    public int deleteAll(Long userId) {
        return notificationRepository.deleteAllByUserId(userId);
    }
}
