-- Migration 056: Add Google Calendar-style fields to company_events
-- เพิ่มฟิลด์: start_time, end_time, is_all_day, location

ALTER TABLE company_events
ADD COLUMN start_time TIME DEFAULT NULL AFTER event_date,
ADD COLUMN end_time TIME DEFAULT NULL AFTER start_time,
ADD COLUMN is_all_day BOOLEAN NOT NULL DEFAULT TRUE AFTER end_time,
ADD COLUMN location VARCHAR(500) DEFAULT NULL AFTER is_all_day;