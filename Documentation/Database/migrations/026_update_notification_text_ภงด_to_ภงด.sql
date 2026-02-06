-- Migration 026: Update notification text from "ภงด." to "ภ.ง.ด."
-- Description: อัพเดทข้อความใน notifications table จาก "ภงด." เป็น "ภ.ง.ด." ใน title และ message
-- Created: 2026-02-02
-- Reference: BUG-131, BUG-133

-- Update title: "มีข้อมูลภงด. ส่งรอตรวจ" -> "มีข้อมูลภ.ง.ด. ส่งรอตรวจ"
UPDATE notifications 
SET title = REPLACE(title, 'มีข้อมูล ภงด. ส่งรอตรวจ', 'มีข้อมูล ภ.ง.ด. ส่งรอตรวจ'),
    updated_at = CURRENT_TIMESTAMP
WHERE title LIKE '%ภงด.%'
  AND deleted_at IS NULL;

-- Update message: Replace "ภงด." with "ภ.ง.ด." in message field
-- This will update all occurrences of "ภงด." in the message
UPDATE notifications 
SET message = REPLACE(message, 'ภงด.', 'ภ.ง.ด.'),
    updated_at = CURRENT_TIMESTAMP
WHERE message LIKE '%ภงด.%'
  AND deleted_at IS NULL;

-- Verify update (optional - for checking)
-- SELECT id, title, message FROM notifications WHERE title LIKE '%ภ.ง.ด.%' OR message LIKE '%ภ.ง.ด.%' LIMIT 10;
