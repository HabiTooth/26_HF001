package com.habitooth.backend.domain.common.type;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "촬영 광원 타입")
public enum LightType {
    WHITE_LIGHT,
    UV_LIGHT
}
