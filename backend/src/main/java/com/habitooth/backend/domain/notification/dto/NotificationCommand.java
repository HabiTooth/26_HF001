package com.habitooth.backend.domain.notification.dto;

import com.habitooth.backend.domain.notification.type.NotificationType;

/**
 * 알림 1건 생성 요청. FE {@code rules.ts} 의 {@code NewNotification} 과 동일 형태.
 * {@link com.habitooth.backend.domain.notification.service.NotificationRules} 가 만들고
 * {@link com.habitooth.backend.domain.notification.service.NotificationService#create} 가 소비한다.
 */
public record NotificationCommand(
        NotificationType type,
        String title,
        String body,
        String link,
        String dedupeKey
) {
}
