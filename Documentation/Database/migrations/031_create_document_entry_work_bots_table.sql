-- Migration 031: Create document_entry_work_bots table
-- Description: ตารางสำหรับเก็บข้อมูลบอทอัตโนมัติสำหรับแต่ละงานคีย์เอกสาร
-- Created: 2026-02-03
-- Reference: Plan - Document Sorting Page Development
-- Important: เก็บข้อมูลบอทหลายตัวสำหรับแต่ละ document_entry_work

CREATE TABLE IF NOT EXISTS document_entry_work_bots (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  document_entry_work_id VARCHAR(36) NOT NULL COMMENT 'Foreign Key to document_entry_work',
  bot_type ENUM(
    'Shopee (Thailand)',
    'SPX Express (Thailand)',
    'Lazada Limited (Head Office)',
    'Lazada Express Limited',
    'ระบบ OCR'
  ) NOT NULL COMMENT 'ประเภทบอท',
  document_count INT DEFAULT 0 COMMENT 'จำนวนเอกสาร',
  ocr_additional_info TEXT NULL COMMENT 'ข้อมูลเพิ่มเติมสำหรับระบบ OCR (แสดงเมื่อเลือก ระบบ OCR)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (document_entry_work_id) REFERENCES document_entry_work(id) ON DELETE CASCADE ON UPDATE CASCADE,
  
  INDEX idx_document_entry_work_bots_work_id (document_entry_work_id),
  INDEX idx_document_entry_work_bots_bot_type (bot_type),
  INDEX idx_document_entry_work_bots_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE document_entry_work_bots COMMENT = 'ตารางข้อมูลบอทอัตโนมัติสำหรับงานคีย์เอกสาร - รองรับหลายบอทต่อ 1 งาน';
