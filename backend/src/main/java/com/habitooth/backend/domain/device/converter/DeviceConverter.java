package com.habitooth.backend.domain.device.converter;

import com.habitooth.backend.domain.device.dto.DeviceRegisterRequest;
import com.habitooth.backend.domain.device.dto.DeviceResponse;
import com.habitooth.backend.domain.device.dto.DeviceStatusResponse;
import com.habitooth.backend.domain.device.entity.Device;
import com.habitooth.backend.domain.device.entity.DeviceRole;
import com.habitooth.backend.domain.device.entity.UserDevice;
import com.habitooth.backend.domain.user.entity.User;

import java.time.LocalDateTime;

public final class DeviceConverter {

    /**
     * 실제 디바이스 연동 전까지의 placeholder.
     */
    private static final long ONLINE_THRESHOLD_MINUTES = 5L;

    private DeviceConverter() {
    }

    public static Device toEntity(DeviceRegisterRequest request) {
        return Device.builder()
                .serialNumber(request.serialNumber())
                .modelName(request.modelName())
                .firmwareVersion(request.firmwareVersion())
                .build();
    }

    /**
     * 현재 이슈에서는 role 을 MEMBER 로 고정한다. (OWNER 지정 로직은 후속 이슈)
     */
    public static UserDevice toUserDevice(User user, Device device) {
        return UserDevice.builder()
                .user(user)
                .device(device)
                .role(DeviceRole.MEMBER)
                .build();
    }

    public static DeviceResponse toResponse(UserDevice userDevice) {
        Device device = userDevice.getDevice();
        return new DeviceResponse(
                device.getId(),
                device.getSerialNumber(),
                device.getModelName(),
                device.getFirmwareVersion(),
                userDevice.getConnectedAt(), // 등록 시점
                device.getLastConnectedAt()
        );
    }

    public static DeviceStatusResponse toStatusResponse(UserDevice userDevice) {
        Device device = userDevice.getDevice();
        return new DeviceStatusResponse(
                device.getId(),
                device.getSerialNumber(),
                device.getModelName(),
                device.getFirmwareVersion(),
                device.getLastConnectedAt(),
                isConnected(device.getLastConnectedAt())
        );
    }

    private static boolean isConnected(LocalDateTime lastConnectedAt) {
        return lastConnectedAt != null
                && lastConnectedAt.isAfter(LocalDateTime.now().minusMinutes(ONLINE_THRESHOLD_MINUTES));
    }
}