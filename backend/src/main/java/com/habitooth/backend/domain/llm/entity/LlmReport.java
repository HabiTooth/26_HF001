package com.habitooth.backend.domain.llm.entity;

import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class LlmReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "llm_report_id")
    private Long id;

    @Column(name = "scan_session_id", nullable = false, unique = true)
    private Long scanSessionId;

    @Column(name = "risk_detail_json", columnDefinition = "LONGTEXT", nullable = false)
    private String riskDetailJson;

    @Column(name = "management_json", columnDefinition = "LONGTEXT", nullable = false)
    private String managementJson;

    @Column(columnDefinition = "TEXT")
    private String disclaimer;

    /**
     * LLM 서버 응답 {@code result} 전체의 원문 JSON (v2).
     *
     * <p>score / interpretation / actions / notice / logicVersion 처럼 서버가 계속 늘려 가는 필드를
     * 컬럼마다 파지 않고 원문으로 보관한다. 서버가 필드를 추가해도 마이그레이션 없이 저장되고,
     * 조회 시 {@link com.habitooth.backend.domain.llm.dto.LlmReportPayload} 로 역직렬화해 내려준다.
     * V23 이전에 생성된 행은 null 이며, 이때 응답의 v2 필드는 전부 null 로 나간다.
     */
    @Column(name = "report_json", columnDefinition = "LONGTEXT")
    private String reportJson;

    public void update(String riskDetailJson, String managementJson, String disclaimer, String reportJson) {
        this.riskDetailJson = riskDetailJson;
        this.managementJson = managementJson;
        this.disclaimer = disclaimer;
        this.reportJson = reportJson;
    }
}
