package com.habitooth.backend.domain.common.type;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "턱 종류 (상악/하악)")
public enum JawType {
    UPPER,  //상악
    LOWER   //하악
}