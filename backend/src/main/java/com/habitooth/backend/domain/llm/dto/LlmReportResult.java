package com.habitooth.backend.domain.llm.dto;

import com.habitooth.backend.domain.common.type.RiskLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

import java.util.List;

@Getter
@Builder
public class LlmReportResult {

    private List<RiskDetailItem> riskDetail;
    private List<ManagementItem> management;
    private String disclaimer;

    /**
     * LLM 서버 응답 {@code result} 전체의 원문 JSON. {@code llm_report.report_json} 에 그대로 저장하고,
     * 조회 시 {@link LlmReportPayload} 로 역직렬화해 v2 필드(score / interpretation / actions / notice)를 복원한다.
     * 원문을 들고 있어야 서버가 필드를 더 붙여도 Spring 배포 없이 저장된다.
     */
    private String rawResultJson;

    // @Jacksonized: LlmReportService#fromJson 이 저장된 리포트(riskDetailJson/managementJson)를
    // 재조회 시 이 타입으로 역직렬화한다. @Builder만으로는 Jackson이 생성자를 찾지 못해 실패한다.
    @Getter
    @Builder
    @Jacksonized
    public static class RiskDetailItem {
        private String title;
        private String detail;
        private RiskLevel riskLevel;
    }

    @Getter
    @Builder
    @Jacksonized
    public static class ManagementItem {
        private String title;
        private String detail;
    }
}
