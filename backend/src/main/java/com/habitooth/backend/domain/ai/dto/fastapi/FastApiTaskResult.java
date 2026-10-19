package com.habitooth.backend.domain.ai.dto.fastapi;

import java.util.List;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FastApiTaskResult {
    private List<FastApiToothArea> toothArea;
    private List<FastApiDetectedIssue> detectedIssues;

    private List<FastApiToothStatus> toothStatuses;

    /** UV 형광 치태 분석 결과. 미실행 시 null/빈 배열. */
    private List<FastApiFluorescenceToothStatus> fluorescenceToothStatuses;

    private Double totalCalculusRatio;
    private Double totalPlaqueRatio;
    private Double totalFluorescencePlaqueRatio;
}
