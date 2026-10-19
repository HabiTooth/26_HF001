
ALTER TABLE analysis_tooth_area
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'DETECTED';

ALTER TABLE analysis_result
    ADD COLUMN expected_tooth_count INT NULL,
    ADD COLUMN coverage_ratio DOUBLE NULL;
