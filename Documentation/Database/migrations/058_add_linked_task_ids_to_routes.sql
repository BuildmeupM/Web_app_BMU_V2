-- Migration: เพิ่ม linked_task_ids ใน messenger_routes
-- เก็บ task ID ที่เชื่อมกับเส้นทาง เพื่ออัปเดต messenger_status เมื่อเส้นทางเสร็จ

ALTER TABLE messenger_routes
ADD COLUMN linked_task_ids JSON DEFAULT NULL AFTER notes;