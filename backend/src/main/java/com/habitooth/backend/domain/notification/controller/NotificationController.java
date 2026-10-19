package com.habitooth.backend.domain.notification.controller;

import com.habitooth.backend.domain.notification.dto.response.NotificationResponse;
import com.habitooth.backend.domain.notification.dto.response.UnreadCountResponse;
import com.habitooth.backend.domain.notification.service.NotificationService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification API", description = "알림함 API")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "알림 목록 조회", description = "최신순 최대 50건. 페이지네이션 없음(화면 진입 시 1회 호출).")
    @GetMapping
    public ApiResponse<List<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ApiResponse.success(notificationService.getNotifications(userDetails.getUserId()));
    }

    @Operation(summary = "미읽음 알림 개수", description = "헤더 벨 배지용.")
    @GetMapping("/unread-count")
    public ApiResponse<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        long count = notificationService.getUnreadCount(userDetails.getUserId());
        return ApiResponse.success(new UnreadCountResponse(count));
    }

    @Operation(summary = "알림 하나 읽음 처리")
    @PatchMapping("/{id}/read")
    public ApiResponse<Void> markRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "알림 ID", example = "12") @PathVariable Long id
    ) {
        notificationService.markRead(userDetails.getUserId(), id);
        return ApiResponse.success();
    }

    @Operation(summary = "알림 전부 읽음 처리")
    @PatchMapping("/read-all")
    public ApiResponse<Void> markAllRead(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        notificationService.markAllRead(userDetails.getUserId());
        return ApiResponse.success();
    }

    @Operation(summary = "알림 하나 삭제")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "알림 ID", example = "12") @PathVariable Long id
    ) {
        notificationService.delete(userDetails.getUserId(), id);
        return ApiResponse.success();
    }

    @Operation(summary = "알림 전체 비우기", description = "해당 사용자의 알림을 모두 삭제.")
    @DeleteMapping
    public ApiResponse<Void> deleteAll(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        notificationService.deleteAll(userDetails.getUserId());
        return ApiResponse.success();
    }
}
