package com.habitooth.backend.domain.llm.dto.eeve;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * result 중 기존(v1) 세 필드만 꺼내는 매핑용 DTO.
 * v2 확장 필드는 이 타입으로 받지 않고 원문 JSON 으로 보존한다({@link EeveReportResponse#getResult()}).
 */
@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class EeveReportResult {

    private List<EeveRiskDetailItem> riskDetail;
    private List<EeveManagementItem> management;
    private String disclaimer;
}
