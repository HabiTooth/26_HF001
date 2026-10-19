package com.habitooth.backend.domain.ai.type;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 구역의 기대 치아(핵심 시퀀스 − 결손치) 각각에 대한 검출 상태. FastAPI scoreVersion 2.3 부터

 */
@Schema(description = "기대 치아의 검출 상태. 채점은 DETECTED 만 대상")
public enum ToothDetectionStatus {

    /** 사진에서 검출되어 채점된 치아 */
    DETECTED,

    /** 기대 치아지만 사진에 잡히지 않음 (재촬영 안내 대상) */
    NOT_DETECTED,

    /** UV 형광 분석에서 유효 픽셀이 부족해 비율을 낼 수 없었던 치아 */
    SKIPPED
}
