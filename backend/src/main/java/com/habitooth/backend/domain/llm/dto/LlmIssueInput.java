package com.habitooth.backend.domain.llm.dto;

import com.habitooth.backend.domain.common.type.LesionType;
import com.habitooth.backend.domain.common.type.RiskLevel;
import lombok.Builder;
import lombok.Getter;

/** LLM 서버로 넘길 치아 단위 입력. 서버 ToothAreaIn 에 대응. */
@Getter
@Builder
public class LlmIssueInput {

    private Integer toothNumber;
    private LesionType lesionType;
    private Double areaRatio;
    private Double toothScore;
    private RiskLevel riskLevel;
}
