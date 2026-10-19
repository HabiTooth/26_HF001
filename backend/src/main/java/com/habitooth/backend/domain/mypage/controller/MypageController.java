package com.habitooth.backend.domain.mypage.controller;

import com.habitooth.backend.domain.device.dto.DeviceStatusResponse;
import com.habitooth.backend.domain.mypage.dto.request.NotificationUpdateRequest;
import com.habitooth.backend.domain.mypage.dto.request.ProfileUpdateRequest;
import com.habitooth.backend.domain.mypage.dto.request.ToothProfileUpdateRequest;
import com.habitooth.backend.domain.mypage.dto.response.NotificationSettingResponse;
import com.habitooth.backend.domain.mypage.dto.response.ProfileResponse;
import com.habitooth.backend.domain.mypage.dto.response.ToothProfileResponse;
import com.habitooth.backend.domain.mypage.service.MypageService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "Mypage API", description = "마이페이지 API")
@SecurityRequirement(name = "bearerAuth")
public class MypageController {

    private final MypageService mypageService;

    @Operation(summary = "회원 정보 조회", description = "현재 프로필 정보를 반환합니다.")
    @GetMapping("/profile")
    public ApiResponse<ProfileResponse> getProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ApiResponse.success(mypageService.getProfile(userDetails.getUserId()));
    }

    @Operation(summary = "회원 정보 수정", description = "이름, 생년월일을 수정합니다.")
    @PatchMapping("/profile")
    public ApiResponse<ProfileResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ProfileUpdateRequest request
    ) {
        return ApiResponse.success(mypageService.updateProfile(userDetails.getUserId(), request));
    }

    @Operation(summary = "치아 프로필 조회", description = "결손치 설정 여부(isSet)와 결손치 FDI 번호 목록을 반환합니다.")
    @GetMapping("/tooth-profile")
    public ApiResponse<ToothProfileResponse> getToothProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ApiResponse.success(mypageService.getToothProfile(userDetails.getUserId()));
    }

    @Operation(
            summary = "치아 프로필 등록/수정",
            description = "결손치 FDI 번호 목록을 통째로 덮어씁니다(토글 단위 X). 결손치가 없으면 빈 배열을 보냅니다."
    )
    @PutMapping("/tooth-profile")
    public ApiResponse<Void> updateToothProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ToothProfileUpdateRequest request
    ) {
        mypageService.replaceToothProfile(userDetails.getUserId(), request.missingTeeth());
        return ApiResponse.success();
    }

    @Operation(summary = "디바이스 연결 상태 조회", description = "사용자에게 등록된 디바이스의 연결 상태를 반환합니다.")
    @GetMapping("/status")
    public ApiResponse<List<DeviceStatusResponse>> getDeviceStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ApiResponse.success(mypageService.getDeviceStatus(userDetails.getUserId()));
    }

    @Operation(summary = "알림 설정 조회", description = "현재 알림 설정을 반환합니다.")
    @GetMapping("/notification")
    public ApiResponse<NotificationSettingResponse> getNotification(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ApiResponse.success(mypageService.getNotification(userDetails.getUserId()));
    }

    @Operation(summary = "알림 설정 변경", description = "푸시 알림 및 리포트 알림 수신 여부를 변경합니다.")
    @PatchMapping("/notification")
    public ApiResponse<NotificationSettingResponse> updateNotification(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody NotificationUpdateRequest request
    ) {
        return ApiResponse.success(mypageService.updateNotification(userDetails.getUserId(), request));
    }

    @Operation(summary = "사용자 기록 삭제", description = "사용자의 모든 스캔 세션을 소프트 딜리트합니다.")
    @DeleteMapping("/data")
    public ApiResponse<Void> deleteUserData(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        mypageService.deleteUserData(userDetails.getUserId());
        return ApiResponse.success(null);
    }
}
