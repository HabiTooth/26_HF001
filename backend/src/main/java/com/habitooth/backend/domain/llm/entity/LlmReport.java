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

    public void update(String riskDetailJson, String managementJson, String disclaimer) {
        this.riskDetailJson = riskDetailJson;
        this.managementJson = managementJson;
        this.disclaimer = disclaimer;
    }
}
