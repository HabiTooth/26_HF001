package com.habitooth.backend.domain.device.service;

import com.habitooth.backend.domain.device.converter.DeviceConverter;
import com.habitooth.backend.domain.device.dto.DeviceRegisterRequest;
import com.habitooth.backend.domain.device.dto.DeviceResponse;
import com.habitooth.backend.domain.device.dto.DeviceStatusResponse;
import com.habitooth.backend.domain.device.entity.Device;
import com.habitooth.backend.domain.device.entity.UserDevice;
import com.habitooth.backend.domain.device.repository.DeviceRepository;
import com.habitooth.backend.domain.device.repository.UserDeviceRepository;
import com.habitooth.backend.domain.user.entity.User;
import com.habitooth.backend.domain.user.repository.UserRepository;
import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final UserRepository userRepository;

    /**
     * 디바이스 등록 (온보딩 초기 연결).
     *
     * <p>같은 시리얼의 디바이스가 이미 존재하면(다른 가족 구성원이 먼저 등록한 경우) 그 디바이스를
     * 재사용하고, 현재 유저와의 매핑(role=MEMBER)만 새로 추가한다.
     */
    @Transactional
    public DeviceResponse register(Long userId, DeviceRegisterRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 기존 디바이스 재사용 or 신규 생성 (디바이스는 시리얼번호로 식별되는 공유 자원)
        Device device = deviceRepository.findBySerialNumber(request.serialNumber())
                .orElseGet(() -> deviceRepository.save(DeviceConverter.toEntity(request)));

        // 동일 유저의 중복 등록 방지
        if (userDeviceRepository.existsByUser_IdAndDevice(userId, device)) {
            throw new CustomException(ErrorCode.DEVICE_ALREADY_REGISTERED);
        }

        // 온보딩 초기 연결 시점 기록
        device.touchConnectedAt(LocalDateTime.now());

        UserDevice userDevice = userDeviceRepository.save(
                DeviceConverter.toUserDevice(user, device) // role = MEMBER 고정
        );

        return DeviceConverter.toResponse(userDevice);
    }

    /**
     * 현재 유저가 등록한 디바이스들의 연결 상태 조회.
     *
     * <p>매핑 테이블 구조상 유저가 여러 디바이스를 등록할 수 있어 리스트로 반환한다.
     * "유저당 1대"로 제약할 경우 등록 시점에 검증을 추가하면 된다.
     */
    public List<DeviceStatusResponse> getStatus(Long userId) {
        return userDeviceRepository.findByUser_Id(userId).stream()
                .map(DeviceConverter::toStatusResponse)
                .toList();
    }
}