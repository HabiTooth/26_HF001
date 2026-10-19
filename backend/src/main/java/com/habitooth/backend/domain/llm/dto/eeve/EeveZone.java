package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Builder;
import lombok.Getter;

/** 서버 ZoneIn 에 대응하는 구역 단위 항목 (요청 zones[]). */
@Getter
@Builder
public class EeveZone {

    private String viewType;
    private Double zoneScore;
    private Boolean zoneValid;
    private Integer detectedToothCount;
    private Double totalCalculusRatio;
    private Double totalPlaqueRatio;
}
