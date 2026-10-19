package com.habitooth.backend.domain.scan.dto.response;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@Schema(description = "촬영 세션 진행 상태")
public class ScanCaptureStatusResponse {

    private Long sessionId;
    private Integer uploadedImageCount;
    private Integer capturedZoneCount;
    private Integer totalZoneCount;
    private Boolean canAnalyze;
    private List<CapturedZone> capturedZones;

    @Getter
    @Builder
    public static class CapturedZone {
        private Long scanImageId;
        private ViewType viewType;
        private LightType lightType;
    }
}
