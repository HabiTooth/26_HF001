-- V1__init_schema.sql
-- HabiTooth initial schema

CREATE TABLE users (
                       user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       email VARCHAR(255) NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       name VARCHAR(50) NOT NULL,
                       birth_date DATE,
                       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       deleted_at DATETIME NULL,

                       CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE device (
                        device_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        serial_number VARCHAR(100) NOT NULL,
                        model_name VARCHAR(100) NOT NULL,
                        firmware_version VARCHAR(50),
                        last_connected_at DATETIME,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                        CONSTRAINT uk_device_serial_number UNIQUE (serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE user_device (
                             user_device_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                             user_id BIGINT NOT NULL,
                             device_id BIGINT NOT NULL,
                             role ENUM('OWNER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
                             connected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                             CONSTRAINT uk_user_device UNIQUE (user_id, device_id),

                             CONSTRAINT fk_user_device_user
                                 FOREIGN KEY (user_id)
                                     REFERENCES users(user_id)
                                     ON DELETE CASCADE,

                             CONSTRAINT fk_user_device_device
                                 FOREIGN KEY (device_id)
                                     REFERENCES device(device_id)
                                     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE notification (
                              notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                              user_id BIGINT NOT NULL,
                              type ENUM('SCAN_REMINDER', 'ANALYSIS_COMPLETE', 'GUIDE', 'SYSTEM') NOT NULL,
                              content VARCHAR(500) NOT NULL,
                              is_read BOOLEAN NOT NULL DEFAULT FALSE,
                              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                              CONSTRAINT fk_notification_user
                                  FOREIGN KEY (user_id)
                                      REFERENCES users(user_id)
                                      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE scan_session (
                              session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                              user_id BIGINT NOT NULL,
                              device_id BIGINT NOT NULL,
                              status ENUM('READY', 'SCANNING', 'COMPLETED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'READY',
                              started_at DATETIME NOT NULL,
                              completed_at DATETIME NULL,
                              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                              deleted_at DATETIME NULL,

                              CONSTRAINT fk_scan_session_user
                                  FOREIGN KEY (user_id)
                                      REFERENCES users(user_id)
                                      ON DELETE RESTRICT,

                              CONSTRAINT fk_scan_session_device
                                  FOREIGN KEY (device_id)
                                      REFERENCES device(device_id)
                                      ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE scan_image (
                            image_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                            session_id BIGINT NOT NULL,
                            image_type ENUM('WHITE_LIGHT', 'UV_LIGHT') NOT NULL,
                            region ENUM('UPPER', 'LOWER', 'FRONT', 'LEFT', 'RIGHT', 'FULL') NOT NULL,
                            s3_url VARCHAR(1000) NOT NULL,
                            captured_at DATETIME NOT NULL,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT fk_scan_image_session
                                FOREIGN KEY (session_id)
                                    REFERENCES scan_session(session_id)
                                    ON DELETE CASCADE,

                            INDEX idx_scan_image_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE analysis_report (
                                 report_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                 report_uuid VARCHAR(36) NOT NULL,
                                 session_id BIGINT NOT NULL,
                                 overall_score INT NOT NULL,
                                 plaque_score INT NOT NULL,
                                 calculus_score INT NOT NULL,
                                 llm_summary TEXT,
                                 generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                 CONSTRAINT uk_analysis_report_uuid UNIQUE (report_uuid),
                                 CONSTRAINT uk_analysis_report_session UNIQUE (session_id),

                                 CONSTRAINT fk_analysis_report_session
                                     FOREIGN KEY (session_id)
                                         REFERENCES scan_session(session_id)
                                         ON DELETE CASCADE,

                                 CONSTRAINT chk_analysis_report_overall_score CHECK (overall_score BETWEEN 0 AND 100),
                                 CONSTRAINT chk_analysis_report_plaque_score CHECK (plaque_score BETWEEN 0 AND 100),
                                 CONSTRAINT chk_analysis_report_calculus_score CHECK (calculus_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE oral_template (
                               template_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                               user_id BIGINT NOT NULL,
                               template_url VARCHAR(1000) NOT NULL,
                               arch_metadata JSON,
                               created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                               CONSTRAINT uk_oral_template_user UNIQUE (user_id),

                               CONSTRAINT fk_oral_template_user
                                   FOREIGN KEY (user_id)
                                       REFERENCES users(user_id)
                                       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE detection_result (
                                  detection_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                  image_id BIGINT NOT NULL,
                                  tooth_number INT NOT NULL,
                                  lesion_type ENUM('PLAQUE', 'CALCULUS') NOT NULL,
                                  confidence FLOAT NOT NULL,
                                  bbox JSON NOT NULL,
                                  area_ratio FLOAT NOT NULL,
                                  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                  CONSTRAINT fk_detection_result_image
                                      FOREIGN KEY (image_id)
                                          REFERENCES scan_image(image_id)
                                          ON DELETE CASCADE,

                                  CONSTRAINT chk_detection_confidence CHECK (confidence >= 0 AND confidence <= 1),
                                  CONSTRAINT chk_detection_area_ratio CHECK (area_ratio >= 0 AND area_ratio <= 1),

                                  INDEX idx_detection_result_image_id (image_id),
                                  INDEX idx_detection_result_tooth_number (tooth_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE tooth_status (
                              tooth_status_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                              report_id BIGINT NOT NULL,
                              template_id BIGINT NOT NULL,
                              tooth_number INT NOT NULL,
                              risk_level ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
                              plaque_ratio FLOAT NOT NULL,
                              calculus_ratio FLOAT NOT NULL,
                              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                              CONSTRAINT uk_tooth_status_report_tooth UNIQUE (report_id, tooth_number),

                              CONSTRAINT fk_tooth_status_report
                                  FOREIGN KEY (report_id)
                                      REFERENCES analysis_report(report_id)
                                      ON DELETE CASCADE,

                              CONSTRAINT fk_tooth_status_template
                                  FOREIGN KEY (template_id)
                                      REFERENCES oral_template(template_id)
                                      ON DELETE RESTRICT,

                              CONSTRAINT chk_tooth_status_tooth_number CHECK (tooth_number BETWEEN 1 AND 32),
                              CONSTRAINT chk_tooth_status_plaque_ratio CHECK (plaque_ratio >= 0 AND plaque_ratio <= 1),
                              CONSTRAINT chk_tooth_status_calculus_ratio CHECK (calculus_ratio >= 0 AND calculus_ratio <= 1),

                              INDEX idx_tooth_status_report_id (report_id),
                              INDEX idx_tooth_status_template_id (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE management_guide (
                                  guide_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                  report_id BIGINT NOT NULL,
                                  category ENUM('PLAQUE', 'CALCULUS', 'BRUSHING', 'CHECKUP', 'GENERAL') NOT NULL,
                                  content TEXT NOT NULL,
                                  priority INT NOT NULL DEFAULT 1,
                                  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                  CONSTRAINT fk_management_guide_report
                                      FOREIGN KEY (report_id)
                                          REFERENCES analysis_report(report_id)
                                          ON DELETE CASCADE,

                                  CONSTRAINT chk_management_guide_priority CHECK (priority >= 1),

                                  INDEX idx_management_guide_report_id (report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;