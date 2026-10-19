package com.habitooth.backend.global.error.handler;

import com.habitooth.backend.global.error.CustomException;
import com.habitooth.backend.global.error.ErrorCode;

public class AiAnalysisHandler extends CustomException {
    public AiAnalysisHandler(ErrorCode errorCode) {
        super(errorCode);
    }
}
