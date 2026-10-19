package com.habitooth.backend.domain.llm.dto.eeve;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class EeveReportResponse {

    private Boolean isSuccess;
    private String message;

    /**
     * result 전체를 트리로 받는다.
     *
     * <p>타입 DTO 로 받으면 서버가 새로 붙인 필드(score / interpretation / actions / notice ...)가
     * 조용히 버려진다. 트리로 받아 {@code llm_report.report_json} 에 원문 그대로 저장하고,
     * 기존 세 필드(riskDetail / management / disclaimer)만 {@link EeveReportResult} 로 따로 매핑한다.
     */
    private JsonNode result;
}
