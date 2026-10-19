package com.habitooth.backend.domain.common.type;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "치아 표면 (외측/설측)")
public enum SurfaceType {
    OUTER, // 외측
    INNER  // 설측
}