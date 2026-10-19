package com.habitooth.backend.global.error;

public class AuthHandler extends CustomException {

    public AuthHandler(ErrorCode errorCode) {
        super(errorCode);
    }
}