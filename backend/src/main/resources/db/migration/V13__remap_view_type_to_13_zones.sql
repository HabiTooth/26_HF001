-- ViewType 9구역 → 13구역 분할.
-- 설측 상/하악을 각 3구역(좌/중/우) → 5구역(대구치/소구치/전치/소구치/대구치)으로 세분화.
-- 외측 3구역(OUTER_LEFT/CENTER/RIGHT)은 이름 그대로 유지된다.
--
-- 기존 데이터 재매핑:
--   *_CENTER → *_FRONT           (전치부로 그대로 이동)
--   *_LEFT / *_RIGHT → *_PREMOLAR (옛 좌/우 구역이 소구치+대구치를 함께 담고 있어
--                                  정확 복원 불가 → 중간인 소구치 구역으로 임시 매핑)
--
-- ⚠️ view_type 은 VARCHAR 이라 스키마 변경은 없다. 컬럼이 없는 최초 환경도 대비해
--    IN 절로 대상 값만 갱신한다.

UPDATE scan_image SET view_type = CASE view_type
        WHEN 'UPPER_CENTER' THEN 'UPPER_FRONT'
        WHEN 'UPPER_LEFT'   THEN 'UPPER_LEFT_PREMOLAR'
        WHEN 'UPPER_RIGHT'  THEN 'UPPER_RIGHT_PREMOLAR'
        WHEN 'LOWER_CENTER' THEN 'LOWER_FRONT'
        WHEN 'LOWER_LEFT'   THEN 'LOWER_LEFT_PREMOLAR'
        WHEN 'LOWER_RIGHT'  THEN 'LOWER_RIGHT_PREMOLAR'
        ELSE view_type
    END
WHERE view_type IN (
    'UPPER_CENTER', 'UPPER_LEFT', 'UPPER_RIGHT',
    'LOWER_CENTER', 'LOWER_LEFT', 'LOWER_RIGHT'
);

UPDATE analysis_result SET view_type = CASE view_type
        WHEN 'UPPER_CENTER' THEN 'UPPER_FRONT'
        WHEN 'UPPER_LEFT'   THEN 'UPPER_LEFT_PREMOLAR'
        WHEN 'UPPER_RIGHT'  THEN 'UPPER_RIGHT_PREMOLAR'
        WHEN 'LOWER_CENTER' THEN 'LOWER_FRONT'
        WHEN 'LOWER_LEFT'   THEN 'LOWER_LEFT_PREMOLAR'
        WHEN 'LOWER_RIGHT'  THEN 'LOWER_RIGHT_PREMOLAR'
        ELSE view_type
    END
WHERE view_type IN (
    'UPPER_CENTER', 'UPPER_LEFT', 'UPPER_RIGHT',
    'LOWER_CENTER', 'LOWER_LEFT', 'LOWER_RIGHT'
);
