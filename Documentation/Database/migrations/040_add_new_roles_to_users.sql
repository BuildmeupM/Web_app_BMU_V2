-- Migration: 040_add_new_roles_to_users.sql
-- Description: เพิ่ม role ใหม่ (hr, registration, marketing) ใน ENUM ของตาราง users
-- Created: 2026-02-10

ALTER TABLE users
MODIFY COLUMN role ENUM(
    'admin',
    'data_entry',
    'data_entry_and_service',
    'audit',
    'service',
    'hr',
    'registration',
    'marketing'
) NOT NULL;