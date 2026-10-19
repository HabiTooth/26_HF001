-- 동일 세션 + 동일 구역 + 동일 조명 타입의 중복 이미지 방지
-- 적용 전에 중복 데이터가 없는지 확인하세요.
-- SELECT session_id, view_type, light_type, COUNT(*)
-- FROM scan_image
-- GROUP BY session_id, view_type, light_type
-- HAVING COUNT(*) > 1;

ALTER TABLE scan_image
    ADD CONSTRAINT uk_scan_image_session_view_light
    UNIQUE (session_id, view_type, light_type);
