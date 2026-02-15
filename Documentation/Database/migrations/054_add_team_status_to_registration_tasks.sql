-- Migration 054: Add team_status column to registration_tasks
-- เพิ่มคอลัมน์สถานะการทำงานในทีม

ALTER TABLE registration_tasks
ADD COLUMN team_status VARCHAR(36) DEFAULT NULL COMMENT 'FK → registration_team_statuses.id — สถานะการทำงานในทีม' AFTER payment_status;

-- Add index for filtering
ALTER TABLE registration_tasks
ADD INDEX idx_team_status (team_status);