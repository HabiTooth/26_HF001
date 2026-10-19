package com.habitooth.backend.domain.device.controller;

import com.habitooth.backend.domain.device.dto.DeviceRegisterRequest;
import com.habitooth.backend.domain.device.dto.DeviceResponse;
import com.habitooth.backend.domain.device.dto.DeviceStatusResponse;
import com.habitooth.backend.domain.device.service.DeviceService;
import com.habitooth.backend.domain.user.security.CustomUserDetails;
import com.habitooth.backend.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Device", description = "디바이스(ESP32-S3) 등록 및 연결 상태 API")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/device")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    @Operation(
            summary = "디바이스 등록",
            description = "온보딩 시 디바이스를 현재 계정에 등록한다. 동일 시리얼의 디바이스가 이미 "
                    + "존재하면 해당 디바이스를 공유하여 등록한다(한 디바이스 : 여러 계정)."
    )
    @PostMapping
    public ApiResponse<DeviceResponse> register(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DeviceRegisterRequest request
    ) {
        DeviceResponse response = deviceService.register(userDetails.getUserId(), request);
        return ApiResponse.success(response);
    }

    @Operation(
            summary = "디바이스 연결 상태 조회",
            description = "현재 계정에 등록된 디바이스들의 연결 상태를 조회한다."
    )
    @GetMapping("/status")
    public ApiResponse<List<DeviceStatusResponse>> getStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<DeviceStatusResponse> response = deviceService.getStatus(userDetails.getUserId());
        return ApiResponse.success(response);
    }
}