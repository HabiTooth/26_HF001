package com.habitooth.backend.domain.scan.entity;

import com.habitooth.backend.domain.common.type.ScanSessionStatus;
import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@Getter
@Entity
@Table(name = "scan_session")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScanSession extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Long id;

//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "user_id", nullable = false)
//    private User user;
//
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "device_id", nullable = false)
//    private Device device;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ScanSessionStatus status;

    @OneToMany(mappedBy = "scanSession", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScanImage> images = new ArrayList<>();

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    private ScanSession(
            Long userId,
            Long deviceId,
            ScanSessionStatus status,
            LocalDateTime startedAt,
            LocalDateTime completedAt,
            LocalDateTime deletedAt
    ) {
        this.userId = userId;
        this.deviceId = deviceId;
        this.status = status;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.deletedAt = deletedAt;
    }

    public static ScanSession create(Long userId, Long deviceId) {
        return ScanSession.builder()
                .userId(userId)
                .deviceId(deviceId)
                .status(ScanSessionStatus.READY)
                .startedAt(LocalDateTime.now())
                .build();
    }

    public void updateStatus(ScanSessionStatus status) {
        this.status = status;
    }

}
