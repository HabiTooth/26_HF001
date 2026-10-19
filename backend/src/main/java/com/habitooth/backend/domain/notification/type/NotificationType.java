package com.habitooth.backend.domain.notification.type;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 알림 종류. FE 가 이 값으로 아이콘·색·이동 경로를 가른다. 값이 늘어나면 FE 에 공유한다.
 */
@Schema(description = "알림 종류")
public enum NotificationType {
    REPORT_READY,
    RISK_ALERT,
    SCAN_REMINDER,
    STREAK,
    CHECKUP
}
