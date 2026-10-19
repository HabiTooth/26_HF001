package com.habitooth.backend.domain.device.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "디바이스 등록 요청")
public record DeviceRegisterRequest(

//        @Schema(description = "디바이스 시리얼 번호", example = "ESP32S3-A1B2C3D4")
        @NotBlank(message = "시리얼 번호는 필수입니다.")
        String serialNumber,

        // V1 스키마상 model_name 은 NOT NULL 이므로 필수값으로 둔다.
        @Schema(description = "모델명", example = "HabiTooth-Scanner-V1")
        @NotBlank(message = "모델명은 필수입니다.")
        String modelName,

        @Schema(description = "펌웨어 버전", example = "1.0.0")
        String firmwareVersion
) {
}