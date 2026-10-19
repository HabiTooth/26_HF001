package com.habitooth.backend.global.error.handler;

import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;

public class HabitHandler extends CustomException {
    public HabitHandler(ErrorCode errorCode) {
        super(errorCode);
    }
}
