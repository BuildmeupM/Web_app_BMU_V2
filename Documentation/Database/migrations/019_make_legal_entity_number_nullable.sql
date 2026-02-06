-- Migration 019: Make legal_entity_number nullable
-- Description: เปลี่ยน legal_entity_number เป็น nullable เพื่อรองรับการ import ข้อมูลที่ไม่มีเลขทะเบียนนิติบุคคล
-- Created: 2026-01-31
-- Reason: Excel template guide ระบุว่า legal_entity_number เป็น optional field แต่ database schema กำหนดเป็น NOT NULL

-- Modify legal_entity_number column to allow NULL
ALTER TABLE clients MODIFY COLUMN legal_entity_number VARCHAR(13) NULL COMMENT 'เลขทะเบียนนิติบุคคล 13 หลัก (สามารถซ้ำกันได้สำหรับสาขา, สามารถเป็น null ได้)';
