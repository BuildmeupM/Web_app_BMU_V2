-- Migration 008: Create wfh_requests table
-- Description: ตารางสำหรับเก็บข้อมูลการขอ Work from Home (WFH) ของพนักงาน
-- Created: 2026-01-29

CREATE TABLE IF NOT EXISTS wfh_requests (
  id VARCHAR(36) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL COMMENT 'รหัสพนักงาน (เช่น AC00010, IT00003)',
  request_date DATE NOT NULL COMMENT 'วันที่ขอ WFH (วันที่ส่งข้อมูลเข้ามาขอ WFH)',
  wfh_date DATE NOT NULL COMMENT 'วันที่ต้องการ WFH',
  status ENUM('รออนุมัติ', 'อนุมัติแล้ว', 'ไม่อนุมัติ') DEFAULT 'รออนุมัติ' COMMENT 'สถานะ WFH',
  approved_by VARCHAR(36) NULL COMMENT 'Foreign Key to users (ผู้ที่อนุมัติ)',
  approved_at DATETIME NULL COMMENT 'เวลาที่อนุมัติ',
  approver_note TEXT NULL COMMENT 'หมายเหตุเพิ่มเติมสำหรับผู้อนุมัติ (บังคับกรอกถ้าไม่อนุมัติ)',
  work_report TEXT NULL COMMENT 'รายงานการทำงาน (พนักงานกรอกหลังจาก WFH)',
  work_report_submitted_at DATETIME NULL COMMENT 'เวลาที่ส่งรายงานการทำงาน',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_wfh_requests_employee_id (employee_id),
  INDEX idx_wfh_requests_status (status),
  INDEX idx_wfh_requests_wfh_date (wfh_date),
  INDEX idx_wfh_requests_request_date (request_date),
  UNIQUE KEY uk_wfh_employee_date (employee_id, wfh_date, deleted_at) COMMENT 'ป้องกันการขอ WFH ซ้ำในวันเดียวกัน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE wfh_requests COMMENT = 'ตารางการขอ Work from Home (WFH) ของพนักงาน';
