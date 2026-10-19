package com.habitooth.backend.domain.ai.dto.fastapi;

import java.util.List;

public class FastApiReportResult {
    private Long sessionId;
    private Integer totalScore;
    private FastApiSummary summary;
    private List<FastApiToothStatus> toothStatuses;
}
