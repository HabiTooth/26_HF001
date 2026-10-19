package com.habitooth.backend.domain.device.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "디바이스 등록 결과")
public record DeviceResponse(

        @Schema(description = "디바이스 ID", example = "1")
        Long deviceId,

        @Schema(description = "시리얼 번호", example = "ESP32S3-A1B2C3D4")
        String serialNumber,

        @Schema(description = "모델명", example = "HabiTooth-Scanner-V1")
        String modelName,

        @Schema(description = "펌웨어 버전", example = "1.0.0")
        String firmwareVersion,

        @Schema(description = "현재 유저가 이 디바이스를 등록한 시각")
        LocalDateTime registeredAt,

        @Schema(description = "마지막 연결 시각")
        LocalDateTime lastConnectedAt
) {
}