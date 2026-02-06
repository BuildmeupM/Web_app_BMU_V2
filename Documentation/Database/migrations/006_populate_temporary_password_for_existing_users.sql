-- Migration: 006_populate_temporary_password_for_existing_users.sql
-- Description: สำหรับ user ที่มีอยู่แล้วและยังไม่มี temporary_password ให้ตั้งค่าเป็น NULL (จะต้องรีเซ็ตรหัสผ่านเพื่อสร้าง temporary_password)
-- Created: 2026-01-31
-- Note: Migration นี้จะไม่ populate temporary_password เพราะเราไม่รู้รหัสผ่านเดิม
--       Admin จะต้องรีเซ็ตรหัสผ่านเพื่อสร้าง temporary_password ใหม่

-- ตรวจสอบว่า column temporary_password มีอยู่แล้วหรือไม่
-- ถ้ายังไม่มี ให้รัน migration 005 ก่อน

-- สำหรับ user ที่มีอยู่แล้ว:
-- temporary_password จะเป็น NULL จนกว่าจะ:
-- 1. สร้าง User Account ใหม่ (จะเก็บ temporary_password อัตโนมัติ)
-- 2. แก้ไขรหัสผ่าน (จะเก็บ temporary_password อัตโนมัติ)
-- 3. รีเซ็ตรหัสผ่าน (จะเก็บ temporary_password อัตโนมัติ)

-- ไม่ต้องทำอะไร - column temporary_password จะเป็น NULL สำหรับ user ที่มีอยู่แล้ว
-- Admin สามารถรีเซ็ตรหัสผ่านเพื่อสร้าง temporary_password ใหม่ได้
