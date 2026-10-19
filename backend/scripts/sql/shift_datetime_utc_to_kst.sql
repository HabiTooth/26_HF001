-- ============================================================================
-- 기존 DATETIME 데이터를 UTC → KST(+9h) 로 한 번만 보정하는 일회성 스크립트
-- ============================================================================
-- 배경
--   운영 EC2(오레곤)의 JVM 기본 시간대가 UTC 였기 때문에, 시간대 고정(fix/timezone-kst) 배포 전에
--   저장된 LocalDateTime 값은 전부 "UTC 벽시계" 다. 배포 후 새로 저장되는 값은 KST 라서 그대로 두면
--   같은 테이블 안에 9시간 어긋난 두 종류의 시각이 섞인다(측정일 단위 집계, 대시보드 scoreDiff 가 틀어짐).
--
-- 사용법 (반드시 순서대로)
--   1. 시간대 고정 버전을 배포하고 서비스가 KST 로 저장하기 시작한 것을 확인한다.
--   2. 아래 @cutoff 를 "배포 직전 시각을 UTC 로 적은 값" 으로 바꾼다. 이 시각보다 앞선 행만 +9h 한다.
--      (배포 후 KST 로 저장된 행은 cutoff 보다 뒤이므로 건드리지 않는다. 배포 직후 9시간 안에 실행할 것 —
--       더 늦어지면 KST 로 저장된 새 행의 시각이 cutoff(UTC) 보다 앞설 수 있어 이중 보정 위험이 있다.)
--   3. 트래픽이 없는 시간에 한 번만 실행한다. 두 번 실행하면 18시간이 밀린다.
--   4. Flyway 마이그레이션에 넣지 않는다 — 환경(로컬/스테이징/운영)마다 데이터 상태가 달라 자동 적용이 위험하다.
--
-- 대상 제외
--   DATE 컬럼(users.birth_date, users.last_dental_visit_at, habit_log.log_date)은 사용자가 고른 날짜라 시간대와 무관.
--   updated_at 이 ON UPDATE CURRENT_TIMESTAMP 인 테이블(users, device, scan_session, oral_template)은
--   SET 절에 updated_at 을 명시해 자동 갱신이 덮어쓰지 않게 한다.
-- ============================================================================

SET @cutoff := '2026-10-17 00:00:00';   -- ← 배포 직전 시각(UTC) 로 수정

START TRANSACTION;

UPDATE users
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR,
       deleted_at = deleted_at + INTERVAL 9 HOUR,
       tooth_profile_set_at = tooth_profile_set_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE device
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR,
       last_connected_at = last_connected_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE user_device
   SET connected_at = connected_at + INTERVAL 9 HOUR
 WHERE connected_at < @cutoff;

UPDATE scan_session
   SET started_at = started_at + INTERVAL 9 HOUR,
       completed_at = completed_at + INTERVAL 9 HOUR,
       created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR,
       deleted_at = deleted_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE scan_image
   SET captured_at = captured_at + INTERVAL 9 HOUR,
       created_at = created_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE analysis_result
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE analysis_tooth_area
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE analysis_detected_issue
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE llm_report
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE llm_report_log
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE notification
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE habit_log
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

UPDATE user_missing_tooth
   SET created_at = created_at + INTERVAL 9 HOUR,
       updated_at = updated_at + INTERVAL 9 HOUR
 WHERE created_at < @cutoff;

-- 레거시 테이블 (더 이상 쓰지 않지만 남아 있다면 함께 보정)
UPDATE tooth_status      SET created_at = created_at + INTERVAL 9 HOUR WHERE created_at < @cutoff;
UPDATE detection_result  SET created_at = created_at + INTERVAL 9 HOUR WHERE created_at < @cutoff;
UPDATE analysis_report   SET generated_at = generated_at + INTERVAL 9 HOUR,
                             created_at = created_at + INTERVAL 9 HOUR WHERE created_at < @cutoff;
UPDATE management_guide  SET created_at = created_at + INTERVAL 9 HOUR WHERE created_at < @cutoff;
UPDATE oral_template     SET created_at = created_at + INTERVAL 9 HOUR,
                             updated_at = updated_at + INTERVAL 9 HOUR WHERE created_at < @cutoff;

-- 확인 후 COMMIT. 값이 이상하면 ROLLBACK.
--   SELECT session_id, started_at, created_at FROM scan_session ORDER BY session_id DESC LIMIT 5;
COMMIT;
