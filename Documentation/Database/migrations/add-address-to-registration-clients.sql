-- =============================================
-- Migration: Add Address Fields to Registration Clients
-- เพิ่มฟิลด์ที่อยู่ในตารางลูกค้างานทะเบียน
-- =============================================

ALTER TABLE registration_clients
ADD COLUMN full_address TEXT NULL COMMENT 'ที่อยู่รวม' AFTER notes,
ADD COLUMN address_number VARCHAR(100) NULL COMMENT 'เลขที่' AFTER full_address,
ADD COLUMN village VARCHAR(200) NULL COMMENT 'หมู่บ้าน' AFTER address_number,
ADD COLUMN building VARCHAR(200) NULL COMMENT 'อาคาร' AFTER village,
ADD COLUMN room_number VARCHAR(50) NULL COMMENT 'ห้องเลขที่' AFTER building,
ADD COLUMN floor_number VARCHAR(50) NULL COMMENT 'ชั้นที่' AFTER room_number,
ADD COLUMN soi VARCHAR(200) NULL COMMENT 'ซอย/ตรอก' AFTER floor_number,
ADD COLUMN moo VARCHAR(50) NULL COMMENT 'หมู่ที่' AFTER soi,
ADD COLUMN road VARCHAR(200) NULL COMMENT 'ถนน' AFTER moo,
ADD COLUMN subdistrict VARCHAR(200) NULL COMMENT 'แขวง/ตำบล' AFTER road,
ADD COLUMN district VARCHAR(200) NULL COMMENT 'เขต/อำเภอ' AFTER subdistrict,
ADD COLUMN province VARCHAR(200) NULL COMMENT 'จังหวัด' AFTER district,
ADD COLUMN postal_code VARCHAR(10) NULL COMMENT 'รหัสไปรษณีย์' AFTER province;