package com.habitooth.backend.domain.user.entity;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "last_dental_visit_at")
    private LocalDate lastDentalVisitAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SocialProvider provider;

    @Column(name = "push_notification_enabled", nullable = false)
    private boolean pushNotificationEnabled = true;

    @Column(name = "report_notification_enabled", nullable = false)
    private boolean reportNotificationEnabled = true;

    @Column(name = "tooth_profile_set_at")
    private LocalDateTime toothProfileSetAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public User(String email, String password, String name, LocalDate birthDate, SocialProvider provider) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.birthDate = birthDate;
        this.provider = provider;
        this.pushNotificationEnabled = true;
        this.reportNotificationEnabled = true;
    }

    public void updateProfile(String name, LocalDate birthDate, LocalDate lastDentalVisitAt) {
        this.name = name;
        this.birthDate = birthDate;
        this.lastDentalVisitAt = lastDentalVisitAt;
    }

    public void updateNotification(boolean pushNotificationEnabled, boolean reportNotificationEnabled) {
        this.pushNotificationEnabled = pushNotificationEnabled;
        this.reportNotificationEnabled = reportNotificationEnabled;
    }

    public void markToothProfileSet(LocalDateTime at) {
        this.toothProfileSetAt = at;
    }

    public boolean isToothProfileSet() {
        return toothProfileSetAt != null;
    }
}