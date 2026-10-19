-- V3(create_analysis_result_storage)에서 이미 만든
--   analysis_result / analysis_tooth_area / analysis_detected_issue
-- 세 테이블을 점수체계 v2.1 스키마로 진화시킨다.
--
-- ⚠️ 원래 이 파일은 CREATE TABLE 이었으나, V3 가 동일 테이블을 이미 생성하므로
--    깨끗한 DB 재생성 시 "table already exists" 로 실패했다. ALTER 로 교체한다.

-- ---------------------------------------------------------------------------
-- analysis_result : 구역(zone) 단위 점수 컬럼 추가
-- ---------------------------------------------------------------------------
ALTER TABLE analysis_result
    MODIFY COLUMN analysis_status VARCHAR(30) NOT NULL;

ALTER TABLE analysis_result
    ADD COLUMN zone_score           DOUBLE      NULL AFTER total_score,
    ADD COLUMN zone_valid           BIT(1)      NULL AFTER zone_score,
    ADD COLUMN detected_tooth_count INT         NULL AFTER zone_valid,
    ADD COLUMN score_version        VARCHAR(10) NULL AFTER detected_tooth_count,
    ADD COLUMN total_calculus_ratio DOUBLE      NULL AFTER score_version,
    ADD COLUMN total_plaque_ratio   DOUBLE      NULL AFTER total_calculus_ratio;

-- ---------------------------------------------------------------------------
-- analysis_tooth_area : polygon 원본 저장 → 치아 단위 병변/점수 컬럼
--   polygon_json 은 더 이상 채우지 않으므로 NULL 허용으로 완화한다(컬럼은 유지).
-- ---------------------------------------------------------------------------
ALTER TABLE analysis_tooth_area
    ADD COLUMN lesion_type VARCHAR(20) NULL AFTER template_region_id,
    ADD COLUMN area_ratio  DOUBLE      NULL AFTER lesion_type,
    ADD COLUMN tooth_score DOUBLE      NULL AFTER area_ratio;

ALTER TABLE analysis_tooth_area
    MODIFY COLUMN polygon_json LONGTEXT NULL;
