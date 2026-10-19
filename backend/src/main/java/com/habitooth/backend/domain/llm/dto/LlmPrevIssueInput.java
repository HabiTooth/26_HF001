package com.habitooth.backend.domain.llm.dto;

import com.habitooth.backend.domain.common.type.LesionType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LlmPrevIssueInput {

    private Integer toothNumber;
    private LesionType lesionType;

    /** 직전 세션의 병변 면적비(%). 같은 병변이 넓어졌는지/좁아졌는지 판정용 */
    private Double areaRatio;
}
