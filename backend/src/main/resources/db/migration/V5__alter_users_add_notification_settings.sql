ALTER TABLE users
    ADD COLUMN push_notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN report_notification_enabled BOOLEAN NOT NULL DEFAULT TRUE;
