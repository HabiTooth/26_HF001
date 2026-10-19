package com.habitooth.backend.domain.mypage.dto.response;

import com.habitooth.backend.domain.user.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationSettingResponse {

    @Schema(description = "푸시 알림 활성화 여부", example = "true")
    private boolean pushNotificationEnabled;

    @Schema(description = "리포트 알림 활성화 여부", example = "false")
    private boolean reportNotificationEnabled;

    public static NotificationSettingResponse from(User user) {
        return NotificationSettingResponse.builder()
                .pushNotificationEnabled(user.isPushNotificationEnabled())
                .reportNotificationEnabled(user.isReportNotificationEnabled())
                .build();
    }
}
