package com.habitooth.backend.domain.mypage.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

public record NotificationUpdateRequest(

        @Schema(description = "푸시 알림 활성화 여부", example = "true")
        boolean pushNotificationEnabled,

        @Schema(description = "리포트 알림 활성화 여부", example = "false")
        boolean reportNotificationEnabled
) {
}
