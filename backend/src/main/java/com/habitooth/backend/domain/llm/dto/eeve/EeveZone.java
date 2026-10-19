package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Builder;
import lombok.Getter;

/** 서버 ZoneIn 에 대응하는 구역 단위 항목 (요청 zones[] / prevZones[]). */
@Getter
@Builder
public class EeveZone {

    private String viewType;

    /** LightType enum name (WHITE_LIGHT / UV_LIGHT). 서버가 치석·치태 행을 구분하는 키 */
    private String lightType;

    private Double zoneScore;
    private Boolean zoneValid;
    private Integer detectedToothCount;
    private Double totalCalculusRatio;
    private Double totalPlaqueRatio;
}
