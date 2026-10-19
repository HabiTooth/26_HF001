-- 알림함. V1 의 notification 테이블은 참조 코드가 없어(엔티티/레포지토리 미존재) 폐기하고 새 스키마로 만든다.
-- 생성 주체가 BE 로 이관되며, dedupe_key 유니크로 스케줄러/재분석의 중복 생성을 막는다.

DROP TABLE IF EXISTS notification;

CREATE TABLE notification (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    type            VARCHAR(30)  NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            VARCHAR(500) NOT NULL,
    link            VARCHAR(255) NOT NULL,
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    dedupe_key      VARCHAR(255) NOT NULL,
    created_at      DATETIME(6)  NOT NULL,
    updated_at      DATETIME(6)  NOT NULL,

    CONSTRAINT uk_notification_user_dedupe UNIQUE (user_id, dedupe_key),

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    INDEX idx_notification_user_latest (user_id, notification_id DESC),
    INDEX idx_notification_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
