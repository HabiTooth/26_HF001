package com.habitooth.backend.domain.ai.dto.fastapi;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiSummary {
    private Double totalPlaqueRatio;
    private Double totalCalculusRatio;

    /**
     * UV 형광 기반 치태 비율(%). 모델 기반 {@code totalPlaqueRatio} 와는 산출 방식이
     * 다른 별도 지표라 FastAPI 가 필드를 나눠서 준다.
     * 형광 분석을 돌리지 않은 이미지에서는 0.0.
     */
    private Double totalFluorescencePlaqueRatio;
}
