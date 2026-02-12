-- ลบคอลัมน์ geolocation ออกจาก login_attempts
ALTER TABLE login_attempts
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS geo_city,
  DROP COLUMN IF EXISTS geo_country;
