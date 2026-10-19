CREATE TABLE analysis_result (
                                 analysis_result_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                 scan_image_id BIGINT NOT NULL,
                                 analysis_status ENUM('SUCCESS', 'FAILED') NOT NULL,
                                 view_type VARCHAR(50) NOT NULL,
                                 ai_task_id VARCHAR(100),
                                 total_score INT,
                                 recommendation TEXT,
                                 created_at DATETIME(6) NOT NULL,
                                 updated_at DATETIME(6) NOT NULL,

                                 CONSTRAINT fk_analysis_result_scan_image
                                     FOREIGN KEY (scan_image_id)
                                         REFERENCES scan_image(image_id)
                                         ON DELETE CASCADE,

                                 INDEX idx_analysis_result_scan_image_id (scan_image_id),
                                 INDEX idx_analysis_result_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE analysis_tooth_area (
                                     analysis_tooth_area_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                     analysis_result_id BIGINT NOT NULL,
                                     area_id INT,
                                     tooth_number INT,
                                     template_region_id VARCHAR(100),
                                     polygon_json LONGTEXT NOT NULL,
                                     created_at DATETIME(6) NOT NULL,
                                     updated_at DATETIME(6) NOT NULL,

                                     CONSTRAINT fk_analysis_tooth_area_result
                                         FOREIGN KEY (analysis_result_id)
                                             REFERENCES analysis_result(analysis_result_id)
                                             ON DELETE CASCADE,

                                     INDEX idx_analysis_tooth_area_result_id (analysis_result_id),
                                     INDEX idx_analysis_tooth_area_tooth_number (tooth_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE analysis_detected_issue (
                                         analysis_detected_issue_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                         analysis_result_id BIGINT NOT NULL,
                                         tooth_number INT,
                                         template_region_id VARCHAR(100),
                                         lesion_type VARCHAR(30) NOT NULL,
                                         confidence DOUBLE NOT NULL,
                                         risk_level VARCHAR(30) NOT NULL,
                                         polygon_json LONGTEXT NOT NULL,
                                         created_at DATETIME(6) NOT NULL,
                                         updated_at DATETIME(6) NOT NULL,

                                         CONSTRAINT fk_analysis_detected_issue_result
                                             FOREIGN KEY (analysis_result_id)
                                                 REFERENCES analysis_result(analysis_result_id)
                                                 ON DELETE CASCADE,

                                         CONSTRAINT chk_analysis_detected_issue_confidence
                                             CHECK (confidence >= 0 AND confidence <= 1),

                                         INDEX idx_analysis_detected_issue_result_id (analysis_result_id),
                                         INDEX idx_analysis_detected_issue_tooth_number (tooth_number),
                                         INDEX idx_analysis_detected_issue_lesion_type (lesion_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;