package com.habitooth.backend.domain.notification.service;

import com.habitooth.backend.domain.notification.dto.NotificationCommand;
import com.habitooth.backend.domain.notification.entity.Notification;
import com.habitooth.backend.domain.notification.repository.NotificationRepository;
import com.habitooth.backend.domain.notification.type.NotificationType;
import com.habitooth.backend.domain.user.entity.SocialProvider;
import com.habitooth.backend.domain.user.entity.User;
import com.habitooth.backend.domain.user.repository.UserRepository;
import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    private static final long USER_ID = 1L;

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationService notificationService;

    private User userWith(boolean push, boolean report) {
        User u = User.builder()
                .email("t@habitooth.com").password("x").name("t")
                .birthDate(LocalDate.of(2000, 1, 1)).provider(SocialProvider.EMAIL)
                .build();
        ReflectionTestUtils.setField(u, "id", USER_ID);
        ReflectionTestUtils.setField(u, "pushNotificationEnabled", push);
        ReflectionTestUtils.setField(u, "reportNotificationEnabled", report);
        return u;
    }

    private NotificationCommand cmd(NotificationType type) {
        return new NotificationCommand(type, "t", "b", "/l", type + ":1");
    }

    @Test
    @DisplayName("create - 정상 저장")
    void create_ok() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(userWith(true, true)));
        when(notificationRepository.existsByUserIdAndDedupeKey(eq(USER_ID), anyString())).thenReturn(false);

        notificationService.create(USER_ID, cmd(NotificationType.REPORT_READY));

        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("create - pushNotificationEnabled=false면 저장 안 함")
    void create_pushOff() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(userWith(false, true)));

        notificationService.create(USER_ID, cmd(NotificationType.SCAN_REMINDER));

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("create - REPORT_READY인데 reportNotificationEnabled=false면 저장 안 함")
    void create_reportOff() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(userWith(true, false)));

        notificationService.create(USER_ID, cmd(NotificationType.REPORT_READY));

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("create - reportNotificationEnabled=false여도 REPORT_READY가 아니면 저장")
    void create_reportOff_butOtherType() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(userWith(true, false)));
        when(notificationRepository.existsByUserIdAndDedupeKey(eq(USER_ID), anyString())).thenReturn(false);

        notificationService.create(USER_ID, cmd(NotificationType.RISK_ALERT));

        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("create - 같은 dedupeKey가 이미 있으면 저장 안 함")
    void create_dedupe() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(userWith(true, true)));
        when(notificationRepository.existsByUserIdAndDedupeKey(eq(USER_ID), anyString())).thenReturn(true);

        notificationService.create(USER_ID, cmd(NotificationType.STREAK));

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("markRead - 남의/없는 알림이면 NOTIFICATION_NOT_FOUND")
    void markRead_notFound() {
        when(notificationRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markRead(USER_ID, 99L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    @Test
    @DisplayName("delete - 없는 알림이면 예외, delete 미호출")
    void delete_notFound() {
        when(notificationRepository.findByIdAndUserId(anyLong(), eq(USER_ID))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.delete(USER_ID, 99L))
                .isInstanceOf(CustomException.class);

        verify(notificationRepository, never()).delete(any());
    }
}
