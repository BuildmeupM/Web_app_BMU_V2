-- Migration 020: Add composite index for work_assignments table
-- Description: เพิ่ม composite index สำหรับ query pattern ที่ใช้บ่อย (build, assignment_year, assignment_month, deleted_at)
-- Created: 2026-01-31
-- Purpose: เพิ่มประสิทธิภาพการ query bulk assignments และ filter operations
-- Reference: Performance Optimization Plan

-- Add composite index for common query pattern:
-- WHERE build IN (...) AND assignment_year = ? AND assignment_month = ? AND deleted_at IS NULL
-- This index covers the most frequently used query pattern in bulk operations
CREATE INDEX IF NOT EXISTS idx_work_assignments_build_year_month 
ON work_assignments(build, assignment_year, assignment_month, deleted_at);

-- Note: This index will significantly improve query performance for:
-- 1. POST /api/work-assignments/bulk-by-builds endpoint
-- 2. Filter operations by build, year, and month
-- 3. Soft delete filtering (deleted_at IS NULL)
