package com.habitooth.backend.domain.ai.dto.fastapi;

import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiDetectedIssue {
    private Integer toothNumber;
    private String issueType;
    private Double confidence;
    private List<FastApiPoint> polygon;
}