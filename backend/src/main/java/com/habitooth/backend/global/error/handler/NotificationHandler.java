package com.habitooth.backend.global.error.handler;

import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;

public class NotificationHandler extends CustomException {
    public NotificationHandler(ErrorCode errorCode) {
        super(errorCode);
    }
}
