package com.habitooth.backend.domain.llm.dto;

import com.habitooth.backend.domain.common.type.LesionType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LlmPrevIssueInput {

    private Integer toothNumber;
    private LesionType lesionType;
}
