-- Migration: 022_add_tax_review_pending_notification_type.sql
-- Description: เพิ่ม notification type สำหรับ tax_review_pending และ tax_review_pending_recheck
-- Created: 2026-01-31

-- เพิ่ม notification types ใหม่สำหรับ Tax Review Pending
ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
  -- User Management
  'password_change', 'user_created', 'user_updated', 'user_deleted',
  -- Leave & WFH
  'leave_request_created', 'leave_request_approved', 'leave_request_rejected', 'leave_request_cancelled',
  'wfh_request_created', 'wfh_request_approved', 'wfh_request_rejected', 'wfh_request_cancelled',
  -- Work Assignment
  'work_assignment_created', 'work_assignment_updated', 'work_assignment_deleted',
  -- Client Management
  'client_created', 'client_updated', 'client_deleted', 'client_import_completed',
  -- Tax & Document
  'tax_data_updated', 'tax_filing_due', 'document_entry_completed', 'document_entry_pending',
  'tax_review_pending', 'tax_review_pending_recheck',
  -- System & General
  'system', 'reminder', 'alert', 'info'
) NOT NULL COMMENT 'ประเภทการแจ้งเตือน';
