package com.habitooth.backend.domain.llm.entity;

import com.habitooth.backend.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class LlmReportLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "llm_report_log_id")
    private Long id;

    @Column(name = "scan_session_id", nullable = false)
    private Long scanSessionId;

    @Column(nullable = false)
    private Boolean success;

    @Column(name = "request_json", columnDefinition = "LONGTEXT", nullable = false)
    private String requestJson;

    @Column(name = "response_json", columnDefinition = "LONGTEXT")
    private String responseJson;

    @Column(name = "error_message", length = 500)
    private String errorMessage;
}
