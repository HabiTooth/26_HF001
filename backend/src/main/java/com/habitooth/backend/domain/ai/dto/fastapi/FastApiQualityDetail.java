package com.habitooth.backend.domain.ai.dto.fastapi;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * detail 의 필드 구성은 응답마다 다르다(예: reason=BLURRY 인 경우 blurScore/blurThreshold/lightType
 * 만 채워지고 나머지는 없음). 그래서 모든 숫자 필드를 래퍼 타입으로 선언한다 —
 * primitive 면 역직렬화 시 0으로 채워져 "검출 0개"와 "값 없음"이 구분되지 않는다.
 */
@Getter
@NoArgsConstructor
public class FastApiQualityDetail {
    private Double blurScore;
    private Double blurThreshold;
    private String lightType;
    private Integer detectedCount;
    private Integer expectedCount;
    private Double meanConfidence;
    private Double minConfidence;
    private Double coverageRatio;
    private Integer borderTouchingCount;
}
