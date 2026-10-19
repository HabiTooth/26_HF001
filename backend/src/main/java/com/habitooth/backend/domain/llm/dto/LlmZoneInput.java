package com.habitooth.backend.domain.llm.dto;

import com.habitooth.backend.domain.common.type.LightType;
import com.habitooth.backend.domain.common.type.ViewType;
import lombok.Builder;
import lombok.Getter;

/** LLM 서버로 넘길 구역(zone) 단위 입력. 서버 ZoneIn 에 대응. 구역별 최신 SUCCESS AnalysisResult 1건에서 뽑는다. */
@Getter
@Builder
public class LlmZoneInput {

    private ViewType viewType;

    /**
     * 이 행을 찍은 광원. LLM 서버가 치석 행(백색광)과 치태 행(UV)을 구분해 감점을 분해하는 데 쓴다.
     * 한 구역을 두 광원으로 찍으면 zones 에 같은 viewType 이 2줄 들어오므로, 이 필드 없이는
     * 서버가 두 줄을 구분할 수 없다.
     */
    private LightType lightType;

    private Double zoneScore;
    private Boolean zoneValid;
    private Integer detectedToothCount;
    private Double totalCalculusRatio;
    private Double totalPlaqueRatio;
}
