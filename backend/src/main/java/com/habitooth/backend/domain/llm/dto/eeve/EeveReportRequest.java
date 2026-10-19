package com.habitooth.backend.domain.llm.dto.eeve;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * LLM 리포트 서버(:8001, /api/llm/report/generate) 요청 바디.
 * 서버 ReportRequest 스키마: zones / teeth / prevTeeth.
 */
@Getter
@Builder
public class EeveReportRequest {

    private List<EeveZone> zones;
    private List<EeveIssue> teeth;

    /** [[toothNumber, lesionType], ...] 형태. 이전 세션 없으면 null. */
    private List<List<Object>> prevTeeth;
}
