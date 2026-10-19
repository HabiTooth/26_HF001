package com.habitooth.backend.domain.device.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "device")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "device_id")
    private Long id;

    @Column(name = "serial_number", length = 100, unique = true, nullable = false)
    private String serialNumber;

    @Column(name = "model_name", length = 100, nullable = false)
    private String modelName;

    @Column(name = "firmware_version", length = 50)
    private String firmwareVersion;

    @Column(name = "last_connected_at")
    private LocalDateTime lastConnectedAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    private Device(String serialNumber, String modelName, String firmwareVersion) {
        this.serialNumber = serialNumber;
        this.modelName = modelName;
        this.firmwareVersion = firmwareVersion;
    }

    /**
     * 디바이스 연결 시각 갱신. 등록(온보딩 초기 연결) 및 실제 ESP32-S3 핸드셰이크 시점에 호출.
     */
    public void touchConnectedAt(LocalDateTime connectedAt) {
        this.lastConnectedAt = connectedAt;
    }
}