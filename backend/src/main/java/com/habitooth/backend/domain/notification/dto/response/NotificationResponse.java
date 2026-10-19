package com.habitooth.backend.domain.notification.dto.response;

import com.habitooth.backend.domain.notification.entity.Notification;
import com.habitooth.backend.domain.notification.type.NotificationType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "알림 1건")
public record NotificationResponse(

        @Schema(description = "알림 ID", example = "12")
        Long id,

        @Schema(description = "알림 종류", example = "REPORT_READY")
        NotificationType type,

        @Schema(description = "제목", example = "분석 리포트가 준비됐어요")
        String title,

        @Schema(description = "본문", example = "이번 스캔 점수는 84점이에요.")
        String body,

        @Schema(description = "이동 경로 (FE 라우트)", example = "/report/57")
        String link,

        @Schema(description = "생성 시각")
        LocalDateTime createdAt,

        @Schema(description = "읽음 여부", example = "false")
        boolean read
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(), n.getCreatedAt(), n.isRead()
        );
    }
}
