package com.habitooth.backend.domain.device.service;

import com.habitooth.backend.domain.device.dto.DeviceRegisterRequest;
import com.habitooth.backend.domain.device.dto.DeviceResponse;
import com.habitooth.backend.domain.device.dto.DeviceStatusResponse;
import com.habitooth.backend.domain.device.entity.Device;
import com.habitooth.backend.domain.device.entity.DeviceRole;
import com.habitooth.backend.domain.device.entity.UserDevice;
import com.habitooth.backend.domain.device.repository.DeviceRepository;
import com.habitooth.backend.domain.device.repository.UserDeviceRepository;
import com.habitooth.backend.domain.user.entity.SocialProvider; // TODO: 실제 enum/값 확인
import com.habitooth.backend.domain.user.entity.User;
import com.habitooth.backend.domain.user.repository.UserRepository;
import com.habitooth.backend.global.error.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {

    @Mock
    private DeviceRepository deviceRepository;
    @Mock
    private UserDeviceRepository userDeviceRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DeviceService deviceService;

    private User user;
    private DeviceRegisterRequest request;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .email("test@habitooth.com")
                .password("hashed")
                .name("테스터")
                .birthDate(LocalDate.of(2000, 1, 1))
                .provider(SocialProvider.EMAIL)
                .build();
        ReflectionTestUtils.setField(user, "id", 1L);

        request = new DeviceRegisterRequest("ESP32S3-A1B2C3D4", "HabiTooth-Scanner-V1", "1.0.0");
    }

    @Test
    @DisplayName("신규 디바이스 등록 시 device 저장 + user_device 매핑 저장")
    void register_newDevice_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(deviceRepository.findBySerialNumber("ESP32S3-A1B2C3D4")).thenReturn(Optional.empty());
        when(deviceRepository.save(any(Device.class))).thenAnswer(inv -> {
            Device d = inv.getArgument(0);
            ReflectionTestUtils.setField(d, "id", 10L);
            return d;
        });
        when(userDeviceRepository.existsByUser_IdAndDevice(eq(1L), any(Device.class))).thenReturn(false);
        when(userDeviceRepository.save(any(UserDevice.class))).thenAnswer(inv -> inv.getArgument(0));

        DeviceResponse response = deviceService.register(1L, request);

        assertThat(response.serialNumber()).isEqualTo("ESP32S3-A1B2C3D4");
        assertThat(response.deviceId()).isEqualTo(10L);
        verify(deviceRepository).save(any(Device.class));
        verify(userDeviceRepository).save(any(UserDevice.class));
    }

    @Test
    @DisplayName("이미 존재하는 시리얼이면 device는 재사용하고 매핑만 추가 (가족 공용)")
    void register_existingDevice_reused() {
        Device existing = Device.builder()
                .serialNumber("ESP32S3-A1B2C3D4")
                .modelName("HabiTooth-Scanner-V1")
                .build();
        ReflectionTestUtils.setField(existing, "id", 10L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(deviceRepository.findBySerialNumber("ESP32S3-A1B2C3D4")).thenReturn(Optional.of(existing));
        when(userDeviceRepository.existsByUser_IdAndDevice(1L, existing)).thenReturn(false);
        when(userDeviceRepository.save(any(UserDevice.class))).thenAnswer(inv -> inv.getArgument(0));

        deviceService.register(1L, request);

        verify(deviceRepository, never()).save(any(Device.class)); // 재사용이므로 신규 저장 없음
        verify(userDeviceRepository).save(any(UserDevice.class));
    }

    @Test
    @DisplayName("동일 유저가 같은 디바이스를 중복 등록하면 예외")
    void register_duplicate_throws() {
        Device existing = Device.builder()
                .serialNumber("ESP32S3-A1B2C3D4")
                .modelName("HabiTooth-Scanner-V1")
                .build();
        ReflectionTestUtils.setField(existing, "id", 10L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(deviceRepository.findBySerialNumber("ESP32S3-A1B2C3D4")).thenReturn(Optional.of(existing));
        when(userDeviceRepository.existsByUser_IdAndDevice(1L, existing)).thenReturn(true);

        assertThatThrownBy(() -> deviceService.register(1L, request))
                .isInstanceOf(CustomException.class);

        verify(userDeviceRepository, never()).save(any(UserDevice.class));
    }

    @Test
    @DisplayName("존재하지 않는 유저로 등록하면 예외")
    void register_userNotFound_throws() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deviceService.register(99L, request))
                .isInstanceOf(CustomException.class);

        verify(deviceRepository, never()).save(any(Device.class));
    }

    @Test
    @DisplayName("연결 상태 조회 - 최근 연결된 디바이스는 connected=true")
    void getStatus_returnsList() {
        Device device = Device.builder()
                .serialNumber("ESP32S3-A1B2C3D4")
                .modelName("HabiTooth-Scanner-V1")
                .build();
        ReflectionTestUtils.setField(device, "id", 10L);
        device.touchConnectedAt(LocalDateTime.now()); // 방금 연결

        UserDevice userDevice = UserDevice.builder()
                .user(user)
                .device(device)
                .role(DeviceRole.MEMBER)
                .build();

        when(userDeviceRepository.findByUser_Id(1L)).thenReturn(List.of(userDevice));

        List<DeviceStatusResponse> result = deviceService.getStatus(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).deviceId()).isEqualTo(10L);
        assertThat(result.get(0).connected()).isTrue();
    }

    @Test
    @DisplayName("연결 상태 조회 - 등록 디바이스 없으면 빈 리스트")
    void getStatus_empty() {
        when(userDeviceRepository.findByUser_Id(1L)).thenReturn(List.of());

        List<DeviceStatusResponse> result = deviceService.getStatus(1L);

        assertThat(result).isEmpty();
    }
}