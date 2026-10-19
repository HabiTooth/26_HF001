-- 기존 테이블이 있다면 삭제
DROP TABLE IF EXISTS tooth_status;

-- 변경된 스펙(session_id)을 반영하여 새롭게 테이블 생성
CREATE TABLE tooth_status (
      tooth_status_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      session_id BIGINT NOT NULL,
      template_id BIGINT,
      tooth_number INT NOT NULL,
      risk_level VARCHAR(50) NOT NULL,
      plaque_ratio DOUBLE NOT NULL,
      calculus_ratio DOUBLE NOT NULL,
      created_at DATETIME,
      UNIQUE KEY unique_session_tooth (session_id, tooth_number)
);