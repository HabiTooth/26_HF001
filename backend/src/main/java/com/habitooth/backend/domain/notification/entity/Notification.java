package com.habitooth.backend.domain.notification.entity;

import com.habitooth.backend.domain.notification.type.NotificationType;
import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 서버가 생성·저장하는 알림 1건. {@code (user_id, dedupe_key)} 유니크로 중복 생성을 막는다.
 * title/body/link 문구는 생성 시점에 확정해서 저장한다(FE rules.ts 이관).
 */
@Entity
@Getter
@Table(name = "notification")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 500)
    private String body;

    @Column(nullable = false)
    private String link;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "dedupe_key", nullable = false)
    private String dedupeKey;

    @Builder
    private Notification(Long userId, NotificationType type, String title, String body, String link, String dedupeKey) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.body = body;
        this.link = link;
        this.dedupeKey = dedupeKey;
        this.read = false;
    }

    public void markRead() {
        this.read = true;
    }
}
