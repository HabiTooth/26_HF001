package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Builder;
import lombok.Getter;

/** 서버 ToothAreaIn 에 대응하는 치아 단위 항목 (요청 teeth[]). */
@Getter
@Builder
public class EeveIssue {

    private Integer toothNumber;
    private String lesionType;
    private Double areaRatio;
    private Double toothScore;
    private String riskLevel;
}
