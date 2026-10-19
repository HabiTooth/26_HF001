package com.habitooth.backend.domain.llm.dto;

import com.habitooth.backend.domain.common.type.ViewType;
import lombok.Builder;
import lombok.Getter;

/** LLM 서버로 넘길 구역(zone) 단위 입력. 서버 ZoneIn 에 대응. 구역별 최신 SUCCESS AnalysisResult 1건에서 뽑는다. */
@Getter
@Builder
public class LlmZoneInput {

    private ViewType viewType;
    private Double zoneScore;
    private Boolean zoneValid;
    private Integer detectedToothCount;
    private Double totalCalculusRatio;
    private Double totalPlaqueRatio;
}
