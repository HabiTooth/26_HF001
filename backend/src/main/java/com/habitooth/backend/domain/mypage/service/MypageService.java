package com.habitooth.backend.domain.mypage.service;

import com.habitooth.backend.domain.device.converter.DeviceConverter;
import com.habitooth.backend.domain.device.dto.DeviceStatusResponse;
import com.habitooth.backend.domain.device.repository.UserDeviceRepository;
import com.habitooth.backend.domain.mypage.dto.request.NotificationUpdateRequest;
import com.habitooth.backend.domain.mypage.dto.request.ProfileUpdateRequest;
import com.habitooth.backend.domain.mypage.dto.response.NotificationSettingResponse;
import com.habitooth.backend.domain.mypage.dto.response.ProfileResponse;
import com.habitooth.backend.domain.mypage.dto.response.ToothProfileResponse;
import com.habitooth.backend.domain.scan.repository.ScanSessionRepository;
import com.habitooth.backend.domain.user.entity.User;
import com.habitooth.backend.domain.user.entity.UserMissingTooth;
import com.habitooth.backend.domain.user.repository.UserMissingToothRepository;
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
public class MypageService {

    private final UserRepository userRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final ScanSessionRepository scanSessionRepository;
    private final UserMissingToothRepository userMissingToothRepository;

    public ProfileResponse getProfile(Long userId) {
        return ProfileResponse.from(findUser(userId));
    }

    @Transactional
    public ProfileResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        User user = findUser(userId);
        user.updateProfile(request.name(), request.birthDate(), request.lastDentalVisitAt());
        return ProfileResponse.from(user);
    }

    public List<DeviceStatusResponse> getDeviceStatus(Long userId) {
        return userDeviceRepository.findByUser_Id(userId).stream()
                .map(DeviceConverter::toStatusResponse)
                .toList();
    }

    public NotificationSettingResponse getNotification(Long userId) {
        return NotificationSettingResponse.from(findUser(userId));
    }

    @Transactional
    public NotificationSettingResponse updateNotification(Long userId, NotificationUpdateRequest request) {
        User user = findUser(userId);
        user.updateNotification(request.pushNotificationEnabled(), request.reportNotificationEnabled());
        return NotificationSettingResponse.from(user);
    }

    public ToothProfileResponse getToothProfile(Long userId) {
        User user = findUser(userId);
        List<Integer> missingTeeth = userMissingToothRepository.findAllByUserId(userId).stream()
                .map(UserMissingTooth::getToothNumber)
                .toList();
        return new ToothProfileResponse(user.isToothProfileSet(), missingTeeth);
    }

    @Transactional
    public void replaceToothProfile(Long userId, List<Integer> missingTeeth) {
        User user = findUser(userId);
        userMissingToothRepository.deleteAllByUserId(userId);
        missingTeeth.stream()
                .distinct()
                .map(toothNumber -> UserMissingTooth.of(userId, toothNumber))
                .forEach(userMissingToothRepository::save);
        user.markToothProfileSet(LocalDateTime.now());
    }

    @Transactional
    public void deleteUserData(Long userId) {
        findUser(userId);
        scanSessionRepository.softDeleteAllByUserId(userId, LocalDateTime.now());
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }
}
