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
