package com.habitooth.backend.global.error.handler;

import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;

public class LlmReportHandler extends CustomException {
    public LlmReportHandler(ErrorCode errorCode) {
        super(errorCode);
    }
}
