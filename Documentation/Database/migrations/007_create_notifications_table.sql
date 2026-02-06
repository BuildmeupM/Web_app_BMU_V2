-- Migration: 007_create_notifications_table.sql
-- Description: สร้างตาราง notifications สำหรับระบบแจ้งเตือน (รองรับการพัฒนาต่อในอนาคต)
-- Created: 2026-01-31
-- Updated: 2026-01-31 (Enhanced for future extensibility)

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID ของผู้ที่ควรได้รับแจ้งเตือน',
  type ENUM(
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
    -- System & General
    'system', 'reminder', 'alert', 'info'
  ) NOT NULL COMMENT 'ประเภทการแจ้งเตือน',
  category VARCHAR(50) NULL COMMENT 'หมวดหมู่การแจ้งเตือน (user_management, leave, work_assignment, client, tax, document, system)',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT 'ระดับความสำคัญ',
  title VARCHAR(255) NOT NULL COMMENT 'หัวข้อการแจ้งเตือน',
  message TEXT NOT NULL COMMENT 'ข้อความการแจ้งเตือน',
  icon VARCHAR(50) NULL COMMENT 'ชื่อไอคอนที่ใช้แสดง (เช่น TbBell, TbAlertCircle)',
  color VARCHAR(20) NULL COMMENT 'สีที่ใช้แสดง (เช่น blue, green, orange, red)',
  action_url VARCHAR(500) NULL COMMENT 'URL สำหรับไปยังหน้าที่เกี่ยวข้อง (เช่น /leave-requests/123)',
  action_label VARCHAR(100) NULL COMMENT 'ข้อความบนปุ่ม action (เช่น "ดูรายละเอียด", "อนุมัติ")',
  related_user_id VARCHAR(36) NULL COMMENT 'User ID ที่เกี่ยวข้อง (เช่น ผู้ที่เปลี่ยนรหัสผ่าน, ผู้ที่สร้าง leave request)',
  related_entity_type VARCHAR(50) NULL COMMENT 'ประเภท entity ที่เกี่ยวข้อง (เช่น leave_request, work_assignment, client)',
  related_entity_id VARCHAR(36) NULL COMMENT 'ID ของ entity ที่เกี่ยวข้อง (เช่น leave_request_id, work_assignment_id)',
  metadata JSON NULL COMMENT 'ข้อมูลเพิ่มเติมในรูปแบบ JSON (เช่น { "build_code": "001", "tax_month": "2026-01" })',
  is_read BOOLEAN DEFAULT FALSE COMMENT 'สถานะการอ่าน (true = อ่านแล้ว, false = ยังไม่อ่าน)',
  read_at TIMESTAMP NULL COMMENT 'เวลาที่อ่าน',
  expires_at TIMESTAMP NULL COMMENT 'วันหมดอายุของการแจ้งเตือน (NULL = ไม่หมดอายุ)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_category (category),
  INDEX idx_notifications_priority (priority),
  INDEX idx_notifications_created_at (created_at),
  INDEX idx_notifications_expires_at (expires_at),
  INDEX idx_notifications_related_user_id (related_user_id),
  INDEX idx_notifications_related_entity (related_entity_type, related_entity_id),
  INDEX idx_notifications_user_read (user_id, is_read),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- เพิ่ม comment สำหรับตาราง
ALTER TABLE notifications COMMENT = 'ตารางการแจ้งเตือน (รองรับการพัฒนาต่อในอนาคต)';

-- สร้างตาราง notification_preferences สำหรับตั้งค่าการแจ้งเตือนของแต่ละ user
CREATE TABLE IF NOT EXISTS notification_preferences (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT 'User ID',
  notification_type VARCHAR(50) NOT NULL COMMENT 'ประเภทการแจ้งเตือน (เช่น password_change, leave_request_created)',
  enabled BOOLEAN DEFAULT TRUE COMMENT 'เปิด/ปิดการแจ้งเตือนประเภทนี้',
  email_enabled BOOLEAN DEFAULT FALSE COMMENT 'ส่งอีเมลแจ้งเตือน (สำหรับอนาคต)',
  push_enabled BOOLEAN DEFAULT FALSE COMMENT 'ส่ง push notification (สำหรับอนาคต)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_notification_type (user_id, notification_type),
  INDEX idx_notification_preferences_user_id (user_id),
  INDEX idx_notification_preferences_type (notification_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- เพิ่ม comment สำหรับตาราง
ALTER TABLE notification_preferences COMMENT = 'ตารางตั้งค่าการแจ้งเตือนของแต่ละ user (รองรับการพัฒนาต่อในอนาคต)';
