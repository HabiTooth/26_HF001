package com.habitooth.backend.domain.llm.client;

import com.habitooth.backend.domain.llm.dto.LlmIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmPrevIssueInput;
import com.habitooth.backend.domain.llm.dto.LlmReportResult;
import com.habitooth.backend.domain.llm.dto.LlmZoneInput;

import java.util.List;

public interface LlmReportClient {

    /**
     * @param zones     구역별 최신 SUCCESS 분석 결과
     * @param teeth     구역들에서 검출된 치아 단위 병변
     * @param prevTeeth 직전 완료 세션의 치아 병변. 이전 세션 없으면 null
     */
    LlmReportResult generateReport(
            List<LlmZoneInput> zones,
            List<LlmIssueInput> teeth,
            List<LlmPrevIssueInput> prevTeeth
    );
}
