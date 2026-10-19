package com.habitooth.backend.domain.scan.dto.request;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanImageUploadRequest {
    @NotNull(message = "사용자 ID는 필수입니다.")
    private Long userId;

    @NotNull(message = "디바이스 ID는 필수입니다.")
    private Long deviceId;

    @NotNull(message = "이미지 타입은 필수입니다.")
    private LightType imageType;

    @NotNull(message = "촬영 영역은 필수입니다.")
    private ViewType region;
}