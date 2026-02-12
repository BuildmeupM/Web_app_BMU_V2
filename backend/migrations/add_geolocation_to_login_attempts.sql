-- Migration: Add geolocation columns to login_attempts
-- Run this SQL in your MySQL database

ALTER TABLE login_attempts
  ADD COLUMN latitude DECIMAL(10,7) DEFAULT NULL AFTER user_agent,
  ADD COLUMN longitude DECIMAL(10,7) DEFAULT NULL AFTER latitude,
  ADD COLUMN geo_city VARCHAR(100) DEFAULT NULL AFTER longitude,
  ADD COLUMN geo_country VARCHAR(100) DEFAULT NULL AFTER geo_city;
