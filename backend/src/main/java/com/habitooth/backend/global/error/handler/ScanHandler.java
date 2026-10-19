package com.habitooth.backend.global.error.handler;

import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;

public class ScanHandler extends CustomException {
    public ScanHandler(ErrorCode errorCode) {
        super(errorCode);
    }
}
