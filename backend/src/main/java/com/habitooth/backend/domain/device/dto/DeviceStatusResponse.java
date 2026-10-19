package com.habitooth.backend.domain.device.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "디바이스 연결 상태")
public record DeviceStatusResponse(

        @Schema(description = "디바이스 ID", example = "1")
        Long deviceId,

        @Schema(description = "시리얼 번호", example = "ESP32S3-A1B2C3D4")
        String serialNumber,

        @Schema(description = "모델명", example = "HabiTooth-Scanner-V1")
        String modelName,

        @Schema(description = "펌웨어 버전", example = "1.0.0")
        String firmwareVersion,

        @Schema(description = "마지막 연결 시각")
        LocalDateTime lastConnectedAt,

        @Schema(
                description = "연결 여부. 현재는 lastConnectedAt 기준의 임시 판정값이며, "
                        + "실제 ESP32-S3 연동(WebRTC/하트비트) 후 실시간 상태로 대체 예정.",
                example = "true"
        )
        boolean connected
) {
}