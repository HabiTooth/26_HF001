package com.habitooth.backend.domain.notification.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "미읽음 알림 개수")
public record UnreadCountResponse(

        @Schema(description = "읽지 않은 알림 수", example = "3")
        long count
) {
}
