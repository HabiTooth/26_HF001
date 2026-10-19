-- 구강 습관(양치 3회 / 치실 / 가글) 날짜별 기록.
-- 달성한 습관 1건당 1행. 특정 날짜 갱신은 "그 날짜 전체 삭제 후 재삽입"(덮어쓰기)이며,
-- (user_id, log_date, habit_type) 유니크로 중복을 막는다.
-- habit_type 값은 애플리케이션의 HabitType enum / FE src/lib/habits.ts 의 HABITS 와 일치한다.
CREATE TABLE habit_log (
                           habit_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                           user_id      BIGINT       NOT NULL,
                           log_date     DATE         NOT NULL,
                           habit_type   VARCHAR(30)  NOT NULL,
                           created_at   DATETIME(6)  NOT NULL,
                           updated_at   DATETIME(6)  NOT NULL,

                           CONSTRAINT uk_habit_log_user_date_type
                               UNIQUE (user_id, log_date, habit_type),

                           CONSTRAINT fk_habit_log_user
                               FOREIGN KEY (user_id)
                                   REFERENCES users(user_id)
                                   ON DELETE CASCADE,

                           INDEX idx_habit_log_user_date (user_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
