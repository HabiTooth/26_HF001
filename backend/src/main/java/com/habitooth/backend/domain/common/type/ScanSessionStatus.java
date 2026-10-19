package com.habitooth.backend.domain.common.type;

public enum ScanSessionStatus {
    READY,          //생성됨
    SCANNING,       //이미지 수집 중
    ANALYZING,      //AI 분석 중
    COMPLETED,      // 완료
    FAILED,         // 실패
    CANCELLED       //중단
}
