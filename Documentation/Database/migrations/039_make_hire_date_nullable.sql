-- Migration: 039_make_hire_date_nullable.sql
-- Description: เปลี่ยน hire_date จาก NOT NULL เป็น NULL เพื่อให้สามารถเพิ่มพนักงานโดยไม่ต้องกรอกวันเริ่มงานได้
-- Created: 2026-02-09
-- Issue: เมื่อเพิ่มพนักงานใหม่โดยไม่กรอกวันเริ่มงาน จะเกิด Error: Column 'hire_date' cannot be null

ALTER TABLE employees MODIFY COLUMN hire_date DATE NULL COMMENT 'วันเริ่มงาน (สามารถเว้นว่างได้ ให้ผู้ใช้แก้ไขทีหลัง)';
