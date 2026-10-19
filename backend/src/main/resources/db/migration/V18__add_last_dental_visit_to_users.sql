-- CHECKUP 알림(정기 검진 리마인더) 스케줄러가 참조할 마지막 치과 방문일. 프로필 수정 API에서 사용자가 직접 입력.
ALTER TABLE users
    ADD COLUMN last_dental_visit_at DATE NULL AFTER birth_date;
