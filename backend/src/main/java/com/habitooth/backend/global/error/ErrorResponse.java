package com.habitooth.backend.global.error;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** 클라이언트에 내려가는 에러 DTO */
@Getter
@AllArgsConstructor
public class ErrorResponse {
    private String field;
    private String message;
}
