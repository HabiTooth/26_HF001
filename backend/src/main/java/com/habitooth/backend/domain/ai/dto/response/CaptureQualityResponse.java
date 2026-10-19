package com.habitooth.backend.domain.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "촬영 직후 경량 화질/구도 판정 결과 (저장되지 않는 임시 판정)")
public class CaptureQualityResponse {

    @Schema(description = "재촬영 필요 여부", example = "false")
    private Boolean needsRetake;

    @Schema(description = "재촬영 사유(BLURRY, TOOTH_NOT_DETECTED, LOW_CONFIDENCE). 통과 시 null", example = "TOOTH_NOT_DETECTED")
    private String reason;

    @Schema(description = "사용자에게 보여줄 안내 메시지. 통과 시 null")
    private String message;

    private QualityDetail detail;

    @Getter
    @Builder
    public static class QualityDetail {
        private Double blurScore;
        private Double blurThreshold;
        private String lightType;
        private Integer detectedCount;
        private Integer expectedCount;
        private Double meanConfidence;
        private Double minConfidence;
        private Double coverageRatio;
        private Integer borderTouchingCount;
    }
}
