-- Migration 007: Create leave_requests table
-- Description: ตารางสำหรับเก็บข้อมูลการลางานของพนักงาน
-- Created: 2026-01-29

CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL COMMENT 'รหัสพนักงาน (เช่น AC00010, IT00003)',
  request_date DATE NOT NULL COMMENT 'วันที่ขอลา (วันที่ส่งข้อมูลเข้ามาขอลา)',
  leave_start_date DATE NOT NULL COMMENT 'วันที่เริ่มลา',
  leave_end_date DATE NOT NULL COMMENT 'วันที่สิ้นสุดลา',
  leave_type ENUM('ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ลาไม่รับค่าจ้าง', 'ลาอื่นๆ') NOT NULL COMMENT 'ประเภทการลา',
  leave_days DECIMAL(5,2) NOT NULL COMMENT 'จำนวนวันลา (คำนวณจาก leave_start_date ถึง leave_end_date)',
  reason TEXT NULL COMMENT 'หมายเหตุ (เช่น ลากิจเนื่องจากอะไร, ลาอื่นๆ เนื่องจากอะไร)',
  status ENUM('รออนุมัติ', 'อนุมัติแล้ว', 'ไม่อนุมัติ') DEFAULT 'รออนุมัติ' COMMENT 'สถานะการลา',
  approved_by VARCHAR(36) NULL COMMENT 'Foreign Key to users (ผู้ที่อนุมัติ)',
  approved_at DATETIME NULL COMMENT 'เวลาที่อนุมัติ',
  approver_note TEXT NULL COMMENT 'หมายเหตุเพิ่มเติมสำหรับผู้อนุมัติ (บังคับกรอกถ้าไม่อนุมัติ)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_leave_requests_employee_id (employee_id),
  INDEX idx_leave_requests_status (status),
  INDEX idx_leave_requests_dates (leave_start_date, leave_end_date),
  INDEX idx_leave_requests_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE leave_requests COMMENT = 'ตารางการลางานของพนักงาน';
