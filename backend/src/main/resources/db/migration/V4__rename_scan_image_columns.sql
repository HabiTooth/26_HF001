ALTER TABLE scan_image
RENAME COLUMN image_type TO light_type;

ALTER TABLE scan_image
RENAME COLUMN region TO view_type;

ALTER TABLE scan_image
MODIFY COLUMN view_type VARCHAR(50) NOT NULL;