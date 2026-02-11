-- Migration: เพิ่มจุดเริ่มต้น + พิกัดสำหรับคำนวณระยะทางอัตโนมัติ

-- เพิ่ม start_location ใน messenger_routes
ALTER TABLE messenger_routes
ADD COLUMN start_location VARCHAR(200) DEFAULT 'สำนักงาน' AFTER route_date,
ADD COLUMN start_lat DECIMAL(10, 7) DEFAULT NULL AFTER start_location,
ADD COLUMN start_lng DECIMAL(10, 7) DEFAULT NULL AFTER start_lat;

-- เพิ่มพิกัดใน messenger_route_stops
ALTER TABLE messenger_route_stops
ADD COLUMN latitude DECIMAL(10, 7) DEFAULT NULL AFTER location_name,
ADD COLUMN longitude DECIMAL(10, 7) DEFAULT NULL AFTER latitude;