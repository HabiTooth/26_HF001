package com.habitooth.backend.domain.llm.client;

import com.habitooth.backend.domain.llm.dto.LlmReportRequestInput;
import com.habitooth.backend.domain.llm.dto.LlmReportResult;

public interface LlmReportClient {

    /**
     * @param input 요청 1건의 입력 전체(점수·구역·치아·직전 세션). 필드 추가는 입력 DTO 에서만 한다.
     */
    LlmReportResult generateReport(LlmReportRequestInput input);

    /**
     * 실제 전송되는 요청 본문 JSON.
     *
     * <p>{@link #generateReport} 가 보내는 것과 같은 변환·직렬화를 거치므로, 호출이 실패해도
     * "보낸 그대로"를 {@code llm_report_log.request_json} 에 남길 수 있다.
     */
    String toRequestJson(LlmReportRequestInput input);
}
