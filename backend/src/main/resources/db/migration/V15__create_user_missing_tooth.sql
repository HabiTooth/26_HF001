CREATE TABLE user_missing_tooth (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tooth_number INT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT uq_user_tooth UNIQUE (user_id, tooth_number),
    CONSTRAINT fk_user_missing_tooth_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);