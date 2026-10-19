package com.habitooth.backend.domain.ai.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OverlayImageResult {

    /** 디코딩된 PNG 바이트 */
    private byte[] png;

    private Integer width;

    private Integer height;
}
