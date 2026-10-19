CREATE TABLE llm_report (
                             llm_report_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                             scan_session_id BIGINT NOT NULL,
                             risk_detail_json LONGTEXT NOT NULL,
                             management_json LONGTEXT NOT NULL,
                             disclaimer TEXT,
                             created_at DATETIME(6) NOT NULL,
                             updated_at DATETIME(6) NOT NULL,

                             CONSTRAINT uk_llm_report_scan_session
                                 UNIQUE (scan_session_id),

                             CONSTRAINT fk_llm_report_scan_session
                                 FOREIGN KEY (scan_session_id)
                                     REFERENCES scan_session(session_id)
                                     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE llm_report_log (
                                 llm_report_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                 scan_session_id BIGINT NOT NULL,
                                 success TINYINT(1) NOT NULL,
                                 request_json LONGTEXT NOT NULL,
                                 response_json LONGTEXT,
                                 error_message VARCHAR(500),
                                 created_at DATETIME(6) NOT NULL,
                                 updated_at DATETIME(6) NOT NULL,

                                 CONSTRAINT fk_llm_report_log_scan_session
                                     FOREIGN KEY (scan_session_id)
                                         REFERENCES scan_session(session_id)
                                         ON DELETE CASCADE,

                                 INDEX idx_llm_report_log_scan_session_id (scan_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
