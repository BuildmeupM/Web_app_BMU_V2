-- Migration 017: Remove UNIQUE constraint from legal_entity_number
-- Description: ลบ UNIQUE constraint จาก legal_entity_number เพื่อรองรับกรณีสาขาที่มีเลขทะเบียนนิติบุคคลซ้ำกัน
-- Created: 2026-01-31
-- Reason: สาขาของบริษัทเดียวกันสามารถมีเลขทะเบียนนิติบุคคลเดียวกันได้

-- Drop the unique constraint/index on legal_entity_number
-- MySQL creates an index with the same name as the column when UNIQUE constraint is defined
ALTER TABLE clients DROP INDEX legal_entity_number;

-- Note: The index idx_clients_legal_entity_number (defined in migration 009) will remain for query performance
-- but it will not enforce uniqueness. If idx_clients_legal_entity_number doesn't exist, create it:
-- CREATE INDEX IF NOT EXISTS idx_clients_legal_entity_number ON clients(legal_entity_number);
