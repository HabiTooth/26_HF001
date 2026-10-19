package com.habitooth.backend.domain.device.entity;

/**
 * V1 스키마: ENUM('OWNER', 'MEMBER') DEFAULT 'MEMBER'.
 * OWNER 지정(첫 등록자 등) 로직은 후속 이슈에서 처리.
 */
public enum DeviceRole {
    OWNER,
    MEMBER
}