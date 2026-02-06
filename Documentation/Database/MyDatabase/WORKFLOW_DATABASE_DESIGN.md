# 📊 Workflow Database Design - ระบบการรับส่งงานภายใน

## 🎯 Overview

เอกสารนี้อธิบายการออกแบบ Database สำหรับระบบการรับส่งงานภายในตาม requirements ที่ระบุไว้ใน `Documentation/Database/MyDatabase/work_flow.md`

**Key Concept**: ระบบทำงานแบบเดือนต่อเดือน โดยข้อมูลลูกค้ายังคงซ้ำเดิม แต่จะมีเปลี่ยนแค่ข้อมูลบางส่วน (เช่น ข้อมูลภาษีรายเดือน, ข้อมูลงานคีย์เอกสาร)

**Primary Key**: `build` (รหัสลูกค้า 3 หลัก เช่น 001, 061, 315) - ใช้เป็นคีย์เวิร์ดหลักสำหรับการเชื่อมข้อมูลของทั้งระบบ

---

## 📋 Database Tables Design

### 1. clients (ข้อมูลลูกค้า)

ตารางหลักสำหรับเก็บข้อมูลพื้นฐานของลูกค้า

```sql
CREATE TABLE clients (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) UNIQUE NOT NULL COMMENT 'รหัสลูกค้า 3 หลัก (เช่น 001, 061, 315)',
  
  -- Basic Information
  business_type ENUM('บริษัทจำกัด', 'บริษัทมหาชนจำกัด', 'ห้างหุ้นส่วน') NOT NULL COMMENT 'ประเภทของกิจการ',
  company_name VARCHAR(500) NOT NULL COMMENT 'ชื่อบริษัท',
  legal_entity_number VARCHAR(13) UNIQUE NOT NULL COMMENT 'เลขทะเบียนนิติบุคคล 13 หลัก',
  establishment_date DATE NULL COMMENT 'วันจัดตั้งกิจการ',
  business_category VARCHAR(200) NULL COMMENT 'ประเภทธุรกิจ',
  business_subcategory VARCHAR(200) NULL COMMENT 'ประเภทธุรกิจย่อย',
  company_size ENUM('SS', 'S', 'MM', 'M', 'LL', 'L', 'XL', 'XXL') NULL COMMENT 'ไซต์บริษัท',
  
  -- Tax Registration
  tax_registration_status ENUM('จดภาษีมูลค่าเพิ่ม', 'ยังไม่จดภาษีมูลค่าเพิ่ม') NULL COMMENT 'สถานะจดทะเบียนภาษี',
  vat_registration_date DATE NULL COMMENT 'วันที่จดภาษีมูลค่าเพิ่ม',
  
  -- Address (Full Address)
  full_address TEXT NULL COMMENT 'ที่อยู่บริษัทแบบรวมทั้งหมด',
  village VARCHAR(200) NULL COMMENT 'หมู่บ้าน',
  building VARCHAR(200) NULL COMMENT 'อาคาร',
  room_number VARCHAR(50) NULL COMMENT 'ห้องเลขที่',
  floor_number VARCHAR(50) NULL COMMENT 'ชั้นที่',
  address_number VARCHAR(50) NULL COMMENT 'เลขที่',
  soi VARCHAR(200) NULL COMMENT 'ซอย/ตรอก',
  moo VARCHAR(50) NULL COMMENT 'หมู่ที่',
  road VARCHAR(200) NULL COMMENT 'ถนน',
  subdistrict VARCHAR(200) NULL COMMENT 'แขวง/ตำบล',
  district VARCHAR(200) NULL COMMENT 'อำเภอ/เขต',
  province VARCHAR(200) NULL COMMENT 'จังหวัด',
  postal_code VARCHAR(10) NULL COMMENT 'รหัสไปรษณี',
  
  -- Company Status
  company_status ENUM('รายเดือน', 'รายเดือน / วางมือ', 'รายเดือน / จ่ายรายปี', 'รายเดือน / เดือนสุดท้าย', 'ยกเลิกทำ') DEFAULT 'รายเดือน' COMMENT 'สถานะบริษัท',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_clients_build (build),
  INDEX idx_clients_legal_entity_number (legal_entity_number),
  INDEX idx_clients_company_status (company_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. accounting_fees (ข้อมูลค่าทำบัญชี)

ตารางสำหรับเก็บข้อมูลค่าบริการทำบัญชีและ HR แยกตามเดือน

**โครงสร้างตาม Excel Layout**: 1 row = 1 ลูกค้า, 12 columns = 12 เดือน (มกราคม-ธันวาคม)

```sql
CREATE TABLE accounting_fees (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Peak System
  peak_code VARCHAR(100) NULL COMMENT 'รหัส Peak (เช่น C000001, Build008, Build010)',
  
  -- Accounting Period
  accounting_start_date DATE NULL COMMENT 'วันที่เริ่มทำบัญชี',
  accounting_end_date DATE NULL COMMENT 'วันที่สิ้นสุดการทำบัญชี',
  accounting_end_reason TEXT NULL COMMENT 'หมายเหตุการสิ้นสุดการทำบัญชี',
  
  -- Year
  fee_year YEAR(4) NOT NULL COMMENT 'ปี (เช่น 2026)',
  
  -- Monthly Accounting Fees (12 เดือน - ตาม Excel Layout)
  accounting_fee_jan DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - มกราคม',
  accounting_fee_feb DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - กุมภาพันธ์',
  accounting_fee_mar DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - มีนาคม',
  accounting_fee_apr DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - เมษายน',
  accounting_fee_may DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - พฤษภาคม',
  accounting_fee_jun DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - มิถุนายน',
  accounting_fee_jul DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - กรกฎาคม',
  accounting_fee_aug DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - สิงหาคม',
  accounting_fee_sep DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - กันยายน',
  accounting_fee_oct DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - ตุลาคม',
  accounting_fee_nov DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - พฤศจิกายน',
  accounting_fee_dec DECIMAL(12,2) NULL COMMENT 'ค่าบริการทำบัญชี - ธันวาคม',
  
  -- Monthly HR Fees (12 เดือน - ตาม Excel Layout)
  hr_fee_jan DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - มกราคม',
  hr_fee_feb DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - กุมภาพันธ์',
  hr_fee_mar DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - มีนาคม',
  hr_fee_apr DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - เมษายน',
  hr_fee_may DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - พฤษภาคม',
  hr_fee_jun DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - มิถุนายน',
  hr_fee_jul DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - กรกฎาคม',
  hr_fee_aug DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - สิงหาคม',
  hr_fee_sep DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - กันยายน',
  hr_fee_oct DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - ตุลาคม',
  hr_fee_nov DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - พฤศจิกายน',
  hr_fee_dec DECIMAL(12,2) NULL COMMENT 'ค่าบริการ HR - ธันวาคม',
  
  -- API Line Information
  line_chat_type VARCHAR(50) NULL COMMENT 'Type Chat สำหรับส่งข้อความหาลูกค้า (Group, Userid)',
  line_chat_id VARCHAR(200) NULL COMMENT 'API Line สำหรับส่งข้อความหาลูกค้า',
  line_billing_chat_type VARCHAR(50) NULL COMMENT 'Type Chat สำหรับวางบิล (Group, Userid)',
  line_billing_id VARCHAR(200) NULL COMMENT 'API Line สำหรับวางบิล',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_accounting_fees_build (build),
  INDEX idx_accounting_fees_year (fee_year),
  UNIQUE KEY uk_accounting_fees_build_year (build, fee_year, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**หมายเหตุ**:
- โครงสร้างนี้ตรงกับ Excel Layout: 1 row = 1 ลูกค้า + 1 ปี, 12 columns สำหรับแต่ละเดือน
- ถ้าต้องการเก็บข้อมูลหลายปี ให้สร้าง row ใหม่สำหรับแต่ละปี
- การ Query ข้อมูลเดือนใดเดือนหนึ่งสามารถทำได้โดยตรง (เช่น `accounting_fee_jan`, `hr_fee_feb`)
- Frontend สามารถแสดงข้อมูลในรูปแบบ Table ได้ง่าย (12 columns สำหรับ 12 เดือน)

---

### 3. dbd_info (ข้อมูลกรมพัฒนาธุรกิจ)

ตารางสำหรับเก็บข้อมูลกรมพัฒนาธุรกิจ (DBD)

```sql
CREATE TABLE dbd_info (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Accounting Period
  accounting_period VARCHAR(100) NULL COMMENT 'รอบบัญชี',
  
  -- Capital Information
  registered_capital DECIMAL(15,2) NULL COMMENT 'ทุนจดทะเบียน',
  paid_capital DECIMAL(15,2) NULL COMMENT 'ทุนชำระ',
  
  -- Business Information
  business_code VARCHAR(100) NULL COMMENT 'รหัสธุรกิจ',
  business_objective_at_registration TEXT NULL COMMENT 'วัตถุประสงค์ ตอนจดทะเบียน',
  
  -- Latest Filing Information
  latest_business_code VARCHAR(100) NULL COMMENT 'รหัสธุรกิจ ที่ส่งงบปีล่าสุด',
  latest_business_objective TEXT NULL COMMENT 'วัตถุประสงค์ ที่ส่งงบปีล่าสุด',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_dbd_info_build (build),
  UNIQUE KEY uk_dbd_info_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. boi_info (ข้อมูลรับสิท BOI)

ตารางสำหรับเก็บข้อมูลสิทธิ์ BOI

```sql
CREATE TABLE boi_info (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- BOI Dates
  boi_approval_date DATE NULL COMMENT 'วันที่ได้รับสิทธิ์ BOI',
  boi_first_use_date DATE NULL COMMENT 'วันที่ใช้สิทธิ์ BOI ครั้งแรก',
  boi_expiry_date DATE NULL COMMENT 'วันที่หมดอายุสิทธิ์ BOI',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_boi_info_build (build),
  UNIQUE KEY uk_boi_info_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. agency_credentials (ข้อมูลรหัสแต่ละหน่วยงาน)

ตารางสำหรับเก็บรหัสผู้ใช้และรหัสผ่านของหน่วยงานต่างๆ

```sql
CREATE TABLE agency_credentials (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- E-filing
  efiling_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ E-filing',
  efiling_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน E-filing (ควร Encrypt)',
  
  -- SSO (ประกันสังคม)
  sso_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ SSO',
  sso_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน SSO (ควร Encrypt)',
  
  -- DBD
  dbd_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ DBD',
  dbd_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน DBD (ควร Encrypt)',
  
  -- กยศ.
  student_loan_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ กยศ.',
  student_loan_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน กยศ. (ควร Encrypt)',
  
  -- กรมบังคับคดี
  enforcement_username VARCHAR(200) NULL COMMENT 'รหัสผู้ใช้ กรมบังคับคดี',
  enforcement_password VARCHAR(500) NULL COMMENT 'รหัสผ่าน กรมบังคับคดี (ควร Encrypt)',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_agency_credentials_build (build),
  UNIQUE KEY uk_agency_credentials_build (build, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Security Note**: รหัสผ่านควร Encrypt ก่อนเก็บใน Database

---

### 6. monthly_tax_data (ข้อมูลภาษีรายเดือน)

ตารางหลักสำหรับเก็บข้อมูลภาษีรายเดือน - **เชื่อมกับหน้า ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี**

**⚠️ สำคัญ: ข้อมูลจะถูกรีเซ็ตทุกเดือน** - แต่ละเดือนจะมีข้อมูลใหม่ และมีการจัดงานใหม่ให้ผู้รับผิดชอบแต่ละส่วนที่แตกต่างกัน

**การทำงาน**:
- แต่ละเดือน (1-12) จะมีข้อมูลแยกกันสำหรับแต่ละลูกค้า
- เมื่อเริ่มเดือนใหม่ ระบบจะสร้างข้อมูลใหม่สำหรับเดือนนั้น (หรือ Copy จากเดือนก่อนหน้า)
- ผู้รับผิดชอบแต่ละส่วน (ทำบัญชี, ตรวจภาษี, ยื่น WHT, ยื่น VAT, คีย์เอกสาร) อาจเปลี่ยนได้ทุกเดือน
- ใช้ `UNIQUE KEY (build, tax_year, tax_month, deleted_at)` เพื่อป้องกันข้อมูลซ้ำในเดือนเดียวกัน

```sql
CREATE TABLE monthly_tax_data (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Month Information (ใช้สำหรับแยกข้อมูลแต่ละเดือน)
  tax_year YEAR(4) NOT NULL COMMENT 'ปี (เช่น 2026)',
  tax_month TINYINT NOT NULL COMMENT 'เดือน (1-12) - แต่ละเดือนจะมีข้อมูลแยกกัน',
  
  -- Responsible Employees
  accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชี (employee_id)',
  tax_inspection_responsible VARCHAR(20) NULL COMMENT 'สถานะเอกสาร (ผู้รับผิดชอบการตรวจภาษีรายเดือน) (employee_id)',
  
  -- Document Receipt
  document_received_date DATETIME NULL COMMENT 'วันที่รับเอกสาร',
  bank_statement_status VARCHAR(100) NULL COMMENT 'สถานะสเตทเม้นท์ธนาคาร',
  
  -- PND (ภงด.) Information
  pnd_sent_for_review_date DATETIME NULL COMMENT 'วันที่ส่งตรวจ ภงด.',
  pnd_review_returned_date DATETIME NULL COMMENT 'วันที่ส่งตรวจคืน ภงด.',
  pnd_sent_to_customer_date DATETIME NULL COMMENT 'วันที่ส่งลูกค้า ภงด.',
  pnd_status VARCHAR(100) NULL COMMENT 'สถานะ ภงด.',
  
  -- Tax Form Statuses (VARCHAR) - เพิ่มใน migration 021
  pnd_1_40_1_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.1 40(1)',
  pnd_1_40_2_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.1 40(2)',
  pnd_3_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.3',
  pnd_53_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.53',
  pp_36_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภ.พ.36',
  student_loan_form_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ กยศ.',
  pnd_2_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.2',
  pnd_54_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.54',
  -- Tax Form Attachment Counts (INT) - เพิ่มใน migration 021
  pnd_1_40_1_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.1 40(1)',
  pnd_1_40_2_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.1 40(2)',
  pnd_3_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.3',
  pnd_53_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.53',
  pp_36_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภ.พ.36',
  student_loan_form_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ กยศ.',
  pnd_2_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.2',
  pnd_54_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.54',
  pt_40 BOOLEAN DEFAULT FALSE COMMENT 'แบบ ภ.ธ.40',
  social_security_form BOOLEAN DEFAULT FALSE COMMENT 'แบบ ประกันสังคม',
  
  -- Tax Form Statuses (VARCHAR) - เพิ่มใน migration 021, boolean fields ถูกลบใน migration 023
  pnd_1_40_1_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.1 40(1)',
  pnd_1_40_2_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.1 40(2)',
  pnd_3_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.3',
  pnd_53_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.53',
  pp_36_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภ.พ.36',
  student_loan_form_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ กยศ.',
  pnd_2_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.2',
  pnd_54_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภงด.54',
  pt_40_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ภ.ธ.40',
  social_security_form_status VARCHAR(100) NULL COMMENT 'สถานะของแบบ ประกันสังคม',
  
  -- Tax Form Attachment Counts (INT) - เพิ่มใน migration 021
  pnd_1_40_1_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.1 40(1)',
  pnd_1_40_2_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.1 40(2)',
  pnd_3_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.3',
  pnd_53_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.53',
  pp_36_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภ.พ.36',
  student_loan_form_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ กยศ.',
  pnd_2_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.2',
  pnd_54_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภงด.54',
  pt_40_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ภ.ธ.40',
  social_security_form_attachment_count INT NULL COMMENT 'จำนวนใบแนบ แบบ ประกันสังคม',
  
  -- Accounting Status
  accounting_record_status VARCHAR(100) NULL COMMENT 'สถานะบันทึกบัญชี',
  monthly_tax_impact VARCHAR(200) NULL COMMENT 'กระทบภาษีประจำเดือน',
  bank_impact VARCHAR(200) NULL COMMENT 'กระทบแบงค์',
  
  -- WHT (Withholding Tax) Information
  wht_draft_completed_date DATETIME NULL COMMENT 'วันที่ร่างแบบเสร็จแล้ว WHT',
  wht_filer_employee_id VARCHAR(20) NULL COMMENT 'ชื่อพนักงานที่ยื่น WHT (employee_id)',
  wht_filer_current_employee_id VARCHAR(20) NULL COMMENT 'ชื่อพนักงานที่ยื่น WHT - คนปัจจุบัน (employee_id)',
  wht_inquiry TEXT NULL COMMENT 'สอบถามเพิ่มเติม ภงด.',
  wht_response TEXT NULL COMMENT 'ตอบกลับ ภงด.',
  wht_submission_comment TEXT NULL COMMENT 'ความเห็นส่งงานยื่นภาษี ภ.ง.ด.',
  wht_filing_response TEXT NULL COMMENT 'ตอบกลับงานยื่นภาษี ภ.ง.ด.',
  
  -- VAT (PP.30) Information
  pp30_sent_for_review_date DATETIME NULL COMMENT 'วันที่ส่งตรวจ ภ.พ. 30',
  pp30_review_returned_date DATETIME NULL COMMENT 'วันที่ส่งตรวจคืน ภ.พ. 30',
  pp30_sent_to_customer_date DATETIME NULL COMMENT 'วันที่ส่งลูกค้า ภ.พ. 30',
  pp30_form BOOLEAN DEFAULT FALSE COMMENT 'แบบ ภพ.30',
  purchase_document_count INT NULL COMMENT 'จำนวนเอกสารภาษีซื้อ',
  income_confirmed VARCHAR(100) NULL COMMENT 'คอนเฟิร์มรายได้ (customer_confirmed, no_confirmation_needed, waiting_customer, customer_request_change)',
  vat_draft_completed_date DATETIME NULL COMMENT 'วันที่ร่างแบบเสร็จแล้ว VAT',
  vat_filer_employee_id VARCHAR(20) NULL COMMENT 'ชื่อพนักงานที่ยื่น VAT (employee_id)',
  vat_filer_current_employee_id VARCHAR(20) NULL COMMENT 'ชื่อพนักงานที่ยื่น VAT - คนปัจจุบัน (employee_id)',
  pp30_inquiry TEXT NULL COMMENT 'สอบถามเพิ่มเติม ภพ.30',
  pp30_response TEXT NULL COMMENT 'ตอบกลับ ภพ.30',
  pp30_submission_comment TEXT NULL COMMENT 'ความเห็นส่งงานยื่นภาษี ภ.พ.30',
  pp30_filing_response TEXT NULL COMMENT 'ตอบกลับงานยื่นภาษี ภ.พ.30',
  
  -- Document Entry Responsible
  document_entry_responsible VARCHAR(20) NULL COMMENT 'พนักงานที่รับผิดชอบในการคีย์ (employee_id)',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_current_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_current_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  INDEX idx_monthly_tax_data_build (build),
  INDEX idx_monthly_tax_data_month (tax_year, tax_month),
  INDEX idx_monthly_tax_data_accounting_responsible (accounting_responsible),
  INDEX idx_monthly_tax_data_tax_inspection_responsible (tax_inspection_responsible),
  INDEX idx_monthly_tax_data_document_entry_responsible (document_entry_responsible),
  UNIQUE KEY uk_monthly_tax_data_build_month (build, tax_year, tax_month, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 7. document_entry_work (ข้อมูลงานคีย์เอกสาร)

ตารางสำหรับเก็บข้อมูลงานคีย์เอกสาร - **เชื่อมกับหน้า คีย์เอกสาร**

**⚠️ สำคัญ: ข้อมูลจะถูกรีเซ็ตทุกเดือน** - แต่ละเดือนจะมีข้อมูลใหม่ และมีการจัดงานใหม่ให้ผู้รับผิดชอบแต่ละส่วนที่แตกต่างกัน

**การทำงาน**:
- แต่ละเดือน (1-12) จะมีข้อมูลแยกกันสำหรับแต่ละลูกค้า
- เมื่อเริ่มเดือนใหม่ ระบบจะสร้างข้อมูลใหม่สำหรับเดือนนั้น (หรือ Copy จากเดือนก่อนหน้า)
- ผู้รับผิดชอบในการคีย์อาจเปลี่ยนได้ทุกเดือน
- `entry_timestamp` เก็บเวลาที่ส่งข้อมูลเข้ามาในเดือนนั้น
- `submission_count` นับจำนวนครั้งที่ส่งเข้ามาในเดือนนั้น
- ใช้ `UNIQUE KEY (build, work_year, work_month, deleted_at)` เพื่อป้องกันข้อมูลซ้ำในเดือนเดียวกัน

```sql
CREATE TABLE document_entry_work (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Month Information (ใช้สำหรับแยกข้อมูลแต่ละเดือน)
  work_year YEAR(4) NOT NULL COMMENT 'ปี (เช่น 2026)',
  work_month TINYINT NOT NULL COMMENT 'เดือน (1-12) - แต่ละเดือนจะมีข้อมูลแยกกัน',
  
  -- Entry Information
  entry_timestamp DATETIME NOT NULL COMMENT 'timestamp - สำหรับพนักงานส่งข้อมูลเข้ามาระบบจะเก็บข้อมูลว่าส่งเข้ามาตอนไหน (ในเดือนนี้)',
  submission_count INT DEFAULT 1 COMMENT 'จำนวนครั้งที่ส่งเข้ามาในระบบ (ในเดือนนี้)',
  
  -- Responsible Employee
  responsible_employee_id VARCHAR(20) NOT NULL COMMENT 'พนักงานที่รับผิดชอบในการคีย์ (employee_id)',
  current_responsible_employee_id VARCHAR(20) NULL COMMENT 'พนักงานที่รับผิดชอบในการคีย์ - คนปัจจุบัน (employee_id)',
  
  -- Responsibility Change Tracking
  responsibility_changed_date DATETIME NULL COMMENT 'วันที่เปลี่ยนผู้รับผิดชอบ',
  responsibility_changed_by VARCHAR(20) NULL COMMENT 'ชื่อผู้เปลี่ยนผู้รับผิดชอบ (employee_id)',
  responsibility_change_note TEXT NULL COMMENT 'หมายเหตุเปลี่ยนผู้รับผิดชอบ',
  
  -- Withholding Tax Documents (เอกสารหัก ณ ที่จ่าย)
  wht_document_count INT DEFAULT 0 COMMENT 'จำนวนเอกสารหัก ณ ที่จ่าย',
  wht_entry_start_datetime DATETIME NULL COMMENT 'วันที่และเวลาที่เริ่มคีย์เอกสารหัก ณ ที่จ่าย',
  wht_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ' COMMENT 'สถานะการคีย์เอกสารหัก ณ ที่จ่าย',
  wht_entry_completed_datetime DATETIME NULL COMMENT 'วันที่และเวลาในการดำเนินการเสร็จของเอกสารหัก ณ ที่จ่าย',
  wht_status_updated_by VARCHAR(20) NULL COMMENT 'ชื่อผู้อัพเดทข้อมูลสถานะเอกสารหัก ณ ที่จ่าย (employee_id)',
  
  -- VAT Documents (เอกสารภาษีมูลค่าเพิ่ม)
  vat_document_count INT DEFAULT 0 COMMENT 'จำนวนเอกสารภาษีมูลค่าเพิ่ม',
  vat_entry_start_datetime DATETIME NULL COMMENT 'วันที่และเวลาที่เริ่มคีย์เอกสารภาษีมูลค่าเพิ่ม',
  vat_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ' COMMENT 'สถานะการคีย์เอกสารภาษีมูลค่าเพิ่ม',
  vat_entry_completed_datetime DATETIME NULL COMMENT 'วันที่และเวลาในการดำเนินการเสร็จของเอกสารภาษีมูลค่าเพิ่ม',
  vat_status_updated_by VARCHAR(20) NULL COMMENT 'ชื่อผู้อัพเดทข้อมูลสถานะเอกสารภาษีมูลค่าเพิ่ม (employee_id)',
  
  -- Non-VAT Documents (เอกสารไม่มีภาษีมูลค่าเพิ่ม)
  non_vat_document_count INT DEFAULT 0 COMMENT 'จำนวนเอกสารไม่มีภาษีมูลค่าเพิ่ม',
  non_vat_entry_start_datetime DATETIME NULL COMMENT 'วันที่และเวลาที่เริ่มคีย์เอกสารไม่มีภาษีมูลค่าเพิ่ม',
  non_vat_entry_status ENUM('ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'ดำเนินการเสร็จแล้ว') DEFAULT 'ยังไม่ดำเนินการ' COMMENT 'สถานะการคีย์เอกสารไม่มีภาษีมูลค่าเพิ่ม',
  non_vat_entry_completed_datetime DATETIME NULL COMMENT 'วันที่และเวลาในการดำเนินการเสร็จของเอกสารไม่มีภาษีมูลค่าเพิ่ม',
  non_vat_status_updated_by VARCHAR(20) NULL COMMENT 'ชื่อผู้อัพเดทข้อมูลสถานะเอกสารไม่มีภาษีมูลค่าเพิ่ม (employee_id)',
  
  -- Comments
  submission_comment TEXT NULL COMMENT 'ความคิดเห็นส่งมอบงานคีย์',
  return_comment TEXT NULL COMMENT 'ความคิดเห็นส่งคืนงานคีย์',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (responsible_employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (current_responsible_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (responsibility_changed_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (non_vat_status_updated_by) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  INDEX idx_document_entry_work_build (build),
  INDEX idx_document_entry_work_month (work_year, work_month),
  INDEX idx_document_entry_work_responsible (responsible_employee_id),
  INDEX idx_document_entry_work_current_responsible (current_responsible_employee_id),
  INDEX idx_document_entry_work_entry_timestamp (entry_timestamp),
  INDEX idx_document_entry_work_wht_status (wht_entry_status),
  INDEX idx_document_entry_work_vat_status (vat_entry_status),
  INDEX idx_document_entry_work_non_vat_status (non_vat_entry_status),
  UNIQUE KEY uk_document_entry_work_build_month (build, work_year, work_month, deleted_at) COMMENT 'ป้องกันข้อมูลซ้ำในเดือนเดียวกัน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 8. work_assignments (ข้อมูลการจัดงานรายเดือน)

ตารางสำหรับเก็บข้อมูลการจัดงานรายเดือน - **ผู้ใช้งานจะต้องเป็นคนเปลี่ยนงานเองใหม่ในแต่ละเดือน**

**⚠️ สำคัญ: การเปลี่ยนงานคือรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` ใหม่ทั้งหมด**

**การทำงาน**:
- แต่ละเดือน (1-12) จะมีการจัดงานแยกกันสำหรับแต่ละลูกค้า
- ผู้ใช้งาน (Admin/HR) จะเป็นคนกำหนดผู้รับผิดชอบแต่ละส่วนในแต่ละเดือน
- เมื่อมีการจัดงานใหม่ ระบบจะรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` สำหรับเดือนนั้นใหม่ทั้งหมด
- ใช้ `UNIQUE KEY (build, assignment_year, assignment_month, deleted_at)` เพื่อป้องกันข้อมูลซ้ำในเดือนเดียวกัน

```sql
CREATE TABLE work_assignments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  build VARCHAR(10) NOT NULL COMMENT 'รหัสลูกค้า (Foreign Key)',
  
  -- Month Information (ใช้สำหรับแยกข้อมูลแต่ละเดือน)
  assignment_year YEAR(4) NOT NULL COMMENT 'ปี (เช่น 2026)',
  assignment_month TINYINT NOT NULL COMMENT 'เดือน (1-12) - แต่ละเดือนจะมีข้อมูลแยกกัน',
  
  -- Responsible Employees (ผู้รับผิดชอบแต่ละส่วน)
  accounting_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบทำบัญชี (employee_id)',
  tax_inspection_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบการตรวจภาษีรายเดือน (employee_id)',
  wht_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น WHT (employee_id)',
  vat_filer_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบยื่น VAT (employee_id)',
  document_entry_responsible VARCHAR(20) NULL COMMENT 'ผู้รับผิดชอบในการคีย์เอกสาร (employee_id)',
  
  -- Assignment Information
  assigned_by VARCHAR(36) NOT NULL COMMENT 'ผู้ที่จัดงาน (user_id)',
  assigned_at DATETIME NOT NULL COMMENT 'วันที่และเวลาที่จัดงาน',
  assignment_note TEXT NULL COMMENT 'หมายเหตุการจัดงาน',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE COMMENT 'สถานะการจัดงาน (true = ใช้งานอยู่, false = ยกเลิก)',
  is_reset_completed BOOLEAN DEFAULT FALSE COMMENT 'สถานะการรีเซ็ตข้อมูล (true = รีเซ็ตเสร็จแล้ว, false = ยังไม่รีเซ็ต)',
  reset_completed_at DATETIME NULL COMMENT 'วันที่และเวลาที่รีเซ็ตข้อมูลเสร็จ',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (build) REFERENCES clients(build) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (accounting_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (tax_inspection_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (wht_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (vat_filer_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (document_entry_responsible) REFERENCES employees(employee_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  
  INDEX idx_work_assignments_build (build),
  INDEX idx_work_assignments_month (assignment_year, assignment_month),
  INDEX idx_work_assignments_accounting_responsible (accounting_responsible),
  INDEX idx_work_assignments_tax_inspection_responsible (tax_inspection_responsible),
  INDEX idx_work_assignments_wht_filer_responsible (wht_filer_responsible),
  INDEX idx_work_assignments_vat_filer_responsible (vat_filer_responsible),
  INDEX idx_work_assignments_document_entry_responsible (document_entry_responsible),
  INDEX idx_work_assignments_assigned_by (assigned_by),
  INDEX idx_work_assignments_is_active (is_active),
  UNIQUE KEY uk_work_assignments_build_month (build, assignment_year, assignment_month, deleted_at) COMMENT 'ป้องกันข้อมูลซ้ำในเดือนเดียวกัน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**ความสัมพันธ์กับตารางอื่น**:
- `work_assignments` → `monthly_tax_data`: เมื่อมีการจัดงานใหม่ ระบบจะรีเซ็ตข้อมูล `monthly_tax_data` สำหรับเดือนนั้น
- `work_assignments` → `document_entry_work`: เมื่อมีการจัดงานใหม่ ระบบจะรีเซ็ตข้อมูล `document_entry_work` สำหรับเดือนนั้น

**กระบวนการรีเซ็ตข้อมูลเมื่อมีการจัดงานใหม่**:
1. ผู้ใช้งาน (Admin/HR) สร้าง/แก้ไข `work_assignments` สำหรับเดือนที่ต้องการ
2. ระบบตรวจสอบว่ามีข้อมูล `monthly_tax_data` และ `document_entry_work` สำหรับเดือนนั้นอยู่หรือไม่
3. ถ้ามีอยู่แล้ว ระบบจะลบข้อมูลเก่า (soft delete) หรือ Reset ค่าเป็น NULL/Default
4. ระบบสร้างข้อมูลใหม่สำหรับ `monthly_tax_data` และ `document_entry_work` โดยใช้ข้อมูลผู้รับผิดชอบจาก `work_assignments`
5. อัพเดท `is_reset_completed = TRUE` และ `reset_completed_at` ใน `work_assignments`

---

## 🔗 Relationships Summary

```
clients (build)
  ├── accounting_fees (build) - 1:N (หลายปี - แต่ละปีมี 12 columns สำหรับ 12 เดือน)
  ├── dbd_info (build) - 1:1
  ├── boi_info (build) - 1:1
  ├── agency_credentials (build) - 1:1
  ├── work_assignments (build) - 1:N (หลายเดือน) - ⚠️ ข้อมูลการจัดงานรายเดือน
  ├── monthly_tax_data (build) - 1:N (หลายเดือน) - ⚠️ รีเซ็ตเมื่อมีการจัดงานใหม่
  └── document_entry_work (build) - 1:N (หลายครั้ง) - ⚠️ รีเซ็ตเมื่อมีการจัดงานใหม่

work_assignments
  ├── accounting_responsible → employees(employee_id)
  ├── tax_inspection_responsible → employees(employee_id)
  ├── wht_filer_responsible → employees(employee_id)
  ├── vat_filer_responsible → employees(employee_id)
  ├── document_entry_responsible → employees(employee_id)
  └── assigned_by → users(id)

monthly_tax_data
  ├── accounting_responsible → employees(employee_id)
  ├── tax_inspection_responsible → employees(employee_id)
  ├── wht_filer_employee_id → employees(employee_id)
  ├── wht_filer_current_employee_id → employees(employee_id)
  ├── vat_filer_employee_id → employees(employee_id)
  ├── vat_filer_current_employee_id → employees(employee_id)
  └── document_entry_responsible → employees(employee_id)

document_entry_work
  ├── responsible_employee_id → employees(employee_id)
  ├── current_responsible_employee_id → employees(employee_id)
  ├── responsibility_changed_by → employees(employee_id)
  ├── wht_status_updated_by → employees(employee_id)
  ├── vat_status_updated_by → employees(employee_id)
  └── non_vat_status_updated_by → employees(employee_id)
```

---

## 📝 Important Notes

### 1. Build Code เป็น Primary Key
- `build` (รหัสลูกค้า 3 หลัก) เป็นคีย์หลักสำหรับเชื่อมข้อมูลทั้งหมด
- ใช้ `VARCHAR(10)` เพื่อรองรับรูปแบบต่างๆ (001, 061, 315, xxx)

### 2. Monthly Data Pattern & Monthly Reset System

#### 2.1 accounting_fees (ข้อมูลค่าทำบัญชี)
- เก็บข้อมูลรายเดือนแบบ Denormalized (1 row = 1 ลูกค้า + 1 ปี, 12 columns สำหรับ 12 เดือน) - **ตรงกับ Excel Layout**
- ถ้าต้องการเก็บข้อมูลหลายปี ให้สร้าง row ใหม่สำหรับแต่ละปี
- ใช้ `UNIQUE KEY (build, fee_year, deleted_at)` เพื่อป้องกันข้อมูลซ้ำในปีเดียวกัน
- **ไม่ถูกรีเซ็ตทุกเดือน** - ข้อมูลจะถูกอัพเดทในแต่ละเดือน

#### 2.2 monthly_tax_data (ข้อมูลภาษีรายเดือน) - ⚠️ รีเซ็ตทุกเดือน
- เก็บข้อมูลรายเดือนแบบ Normalized (1 row = 1 ลูกค้า + 1 เดือน)
- ใช้ `UNIQUE KEY (build, tax_year, tax_month, deleted_at)` เพื่อป้องกันข้อมูลซ้ำในเดือนเดียวกัน
- **การรีเซ็ตทุกเดือน**:
  - แต่ละเดือน (1-12) จะมีข้อมูลแยกกันสำหรับแต่ละลูกค้า
  - เมื่อเริ่มเดือนใหม่ ระบบจะสร้างข้อมูลใหม่สำหรับเดือนนั้น
  - ผู้รับผิดชอบแต่ละส่วน (ทำบัญชี, ตรวจภาษี, ยื่น WHT, ยื่น VAT, คีย์เอกสาร) อาจเปลี่ยนได้ทุกเดือน
  - ข้อมูลในเดือนก่อนหน้าไม่ถูกลบ แต่จะถูกเก็บไว้เป็นประวัติ
- **วิธีการทำงาน**:
  - **Option 1: สร้างข้อมูลใหม่เปล่า** - เริ่มต้นด้วยค่า NULL หรือค่า Default
  - **Option 2: Copy จากเดือนก่อนหน้า** - Copy ข้อมูลบางส่วน (เช่น ผู้รับผิดชอบ) จากเดือนก่อนหน้า แต่ Reset ข้อมูลที่เกี่ยวข้องกับงาน (เช่น วันที่, สถานะ)
  - **API Endpoint**: `POST /api/monthly-tax-data/reset-month` - สำหรับรีเซ็ตข้อมูลเดือนใหม่

#### 2.3 document_entry_work (ข้อมูลงานคีย์เอกสาร) - ⚠️ รีเซ็ตทุกเดือน
- เก็บข้อมูลรายเดือนแบบ Normalized (1 row = 1 ลูกค้า + 1 เดือน)
- ใช้ `UNIQUE KEY (build, work_year, work_month, deleted_at)` เพื่อป้องกันข้อมูลซ้ำในเดือนเดียวกัน
- **การรีเซ็ตทุกเดือน**:
  - แต่ละเดือน (1-12) จะมีข้อมูลแยกกันสำหรับแต่ละลูกค้า
  - เมื่อเริ่มเดือนใหม่ ระบบจะสร้างข้อมูลใหม่สำหรับเดือนนั้น
  - ผู้รับผิดชอบในการคีย์อาจเปลี่ยนได้ทุกเดือน
  - `entry_timestamp` เก็บเวลาที่ส่งข้อมูลเข้ามาในเดือนนั้น
  - `submission_count` นับจำนวนครั้งที่ส่งเข้ามาในเดือนนั้น (Reset เป็น 1 เมื่อเริ่มเดือนใหม่)
- **วิธีการทำงาน**:
  - **Option 1: สร้างข้อมูลใหม่เปล่า** - เริ่มต้นด้วยค่า NULL หรือค่า Default
  - **Option 2: Copy จากเดือนก่อนหน้า** - Copy ข้อมูลบางส่วน (เช่น ผู้รับผิดชอบ) จากเดือนก่อนหน้า แต่ Reset ข้อมูลที่เกี่ยวข้องกับงาน (เช่น จำนวนเอกสาร, สถานะการคีย์)
  - **API Endpoint**: `POST /api/document-entry-work/reset-month` - สำหรับรีเซ็ตข้อมูลเดือนใหม่

### 3. Timestamp Fields
- ข้อมูลวันที่ทั้งหมดเก็บเป็น `DATETIME` หรือ `DATE` ตามที่ระบุ
- `entry_timestamp` ใน `document_entry_work` เก็บเวลาที่ส่งข้อมูลเข้ามา

### 4. Employee References
- ใช้ `employee_id` (VARCHAR(20)) แทน `employees.id` (UUID) เพื่อความสะดวกในการอ้างอิง
- Foreign Key ไปที่ `employees(employee_id)` ไม่ใช่ `employees(id)`

### 5. Security
- รหัสผ่านใน `agency_credentials` ควร Encrypt ก่อนเก็บใน Database
- ใช้ bcrypt หรือ encryption library อื่นๆ

### 6. Status Fields
- ใช้ `ENUM` สำหรับสถานะที่มีค่าคงที่
- ใช้ `VARCHAR` สำหรับสถานะที่อาจเปลี่ยนแปลงในอนาคต

### 8. Work Assignment System - การจัดงานรายเดือน

#### 8.1 ระบบการจัดงานรายเดือน
- **ผู้ใช้งาน**: Admin/HR จะเป็นคนกำหนดผู้รับผิดชอบแต่ละส่วนในแต่ละเดือน
- **ตาราง**: `work_assignments` - เก็บข้อมูลการจัดงานรายเดือน
- **การรีเซ็ต**: เมื่อมีการจัดงานใหม่ ระบบจะรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` สำหรับเดือนนั้นใหม่ทั้งหมด

#### 8.2 กระบวนการจัดงานใหม่
1. **สร้าง/แก้ไข Work Assignment**:
   - ผู้ใช้งาน (Admin/HR) สร้างหรือแก้ไข `work_assignments` สำหรับเดือนที่ต้องการ
   - กำหนดผู้รับผิดชอบแต่ละส่วน (ทำบัญชี, ตรวจภาษี, ยื่น WHT, ยื่น VAT, คีย์เอกสาร)
   - บันทึกข้อมูล

2. **รีเซ็ตข้อมูลอัตโนมัติ**:
   - เมื่อบันทึก `work_assignments` ระบบจะรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` สำหรับเดือนนั้น
   - ลบข้อมูลเก่า (soft delete) หรือ Reset ค่าเป็น NULL/Default
   - สร้างข้อมูลใหม่โดยใช้ข้อมูลผู้รับผิดชอบจาก `work_assignments`
   - อัพเดท `is_reset_completed = TRUE` และ `reset_completed_at` ใน `work_assignments`

3. **การ Query ข้อมูล**:
   - Query `work_assignments` เพื่อดูผู้รับผิดชอบแต่ละส่วนในแต่ละเดือน
   - Query `monthly_tax_data` และ `document_entry_work` เพื่อดูข้อมูลงานที่ถูกจัดให้

#### 8.3 API Endpoints สำหรับ Work Assignment

**GET `/api/work-assignments`**
- ดึงรายการการจัดงานทั้งหมด (paginated, filter by build, year, month)

**GET `/api/work-assignments/:build/:year/:month`**
- ดึงข้อมูลการจัดงานตาม Build, Year, Month

**POST `/api/work-assignments`**
- สร้างการจัดงานใหม่ (พร้อมรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work`)

**PUT `/api/work-assignments/:id`**
- แก้ไขการจัดงาน (พร้อมรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work`)

**POST `/api/work-assignments/:id/reset-data`**
- รีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` สำหรับการจัดงานนี้ (Manual Reset)

#### 8.4 Frontend UI สำหรับ Work Assignment
- หน้า "จัดงานรายเดือน" สำหรับ Admin/HR
- แสดงรายการการจัดงานทั้งหมด (Table)
- Form สำหรับสร้าง/แก้ไขการจัดงาน
- แสดงผู้รับผิดชอบแต่ละส่วน (ทำบัญชี, ตรวจภาษี, ยื่น WHT, ยื่น VAT, คีย์เอกสาร)
- ปุ่ม "รีเซ็ตข้อมูล" สำหรับรีเซ็ตข้อมูล Manual
- แสดงสถานะการรีเซ็ต (`is_reset_completed`)

---

### 9. Monthly Reset System - Implementation Guide

#### 9.1 เมื่อไหร่ควรรีเซ็ตข้อมูล?
- **อัตโนมัติเมื่อมีการจัดงานใหม่**: เมื่อมีการสร้าง/แก้ไข `work_assignments` ระบบจะรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` อัตโนมัติ
- **อัตโนมัติเมื่อเริ่มเดือนใหม่**: เมื่อเริ่มเดือนใหม่ (วันที่ 1 ของทุกเดือน) - ใช้ Cron Job หรือ Scheduled Task (ถ้ายังไม่มีการจัดงาน)
- **Manual**: ผู้ดูแลระบบสามารถรีเซ็ตข้อมูลเดือนใหม่ได้ผ่าน API หรือ UI

#### 9.2 ข้อมูลอะไรที่ควร Copy จากเดือนก่อนหน้า? (เมื่อรีเซ็ตอัตโนมัติเมื่อเริ่มเดือนใหม่)
**monthly_tax_data**:
- ✅ Copy: `accounting_responsible`, `tax_inspection_responsible`, `document_entry_responsible` (ถ้าต้องการ)
- ❌ Reset: `document_received_date`, `bank_statement_status`, `pnd_*_date`, `pnd_status`, `wht_*_date`, `vat_*_date`, `pp30_*_date`, `accounting_record_status`, `monthly_tax_impact`, `bank_impact`
- ❌ Reset: Form checkboxes (pnd_1_40_1, pnd_1_40_2, etc.) → FALSE
- ❌ Reset: Comments และ Responses → NULL

**document_entry_work**:
- ✅ Copy: `responsible_employee_id` (ถ้าต้องการ)
- ❌ Reset: `entry_timestamp` → เวลาปัจจุบัน
- ❌ Reset: `submission_count` → 1
- ❌ Reset: `wht_document_count`, `vat_document_count`, `non_vat_document_count` → 0
- ❌ Reset: `wht_entry_status`, `vat_entry_status`, `non_vat_entry_status` → 'ยังไม่ดำเนินการ'
- ❌ Reset: `wht_entry_start_datetime`, `vat_entry_start_datetime`, `non_vat_entry_start_datetime` → NULL
- ❌ Reset: `wht_entry_completed_datetime`, `vat_entry_completed_datetime`, `non_vat_entry_completed_datetime` → NULL
- ❌ Reset: Comments → NULL

#### 9.3 API Endpoints สำหรับรีเซ็ตข้อมูล

**POST `/api/work-assignments/:id/reset-data`** (Recommended - ใช้เมื่อมีการจัดงานใหม่)
```json
{
  "reset_monthly_tax_data": true,
  "reset_document_entry_work": true
}
```
- รีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` สำหรับการจัดงานนี้
- ใช้ข้อมูลผู้รับผิดชอบจาก `work_assignments`

**POST `/api/monthly-tax-data/reset-month`** (Alternative - ใช้เมื่อรีเซ็ตอัตโนมัติเมื่อเริ่มเดือนใหม่)
```json
{
  "build": "001",
  "year": 2026,
  "month": 2,
  "copy_from_previous_month": true,
  "copy_responsible_employees": true
}
```

**POST `/api/document-entry-work/reset-month`** (Alternative - ใช้เมื่อรีเซ็ตอัตโนมัติเมื่อเริ่มเดือนใหม่)
```json
{
  "build": "001",
  "year": 2026,
  "month": 2,
  "copy_from_previous_month": true,
  "copy_responsible_employee": true
}
```

#### 9.4 Frontend UI สำหรับรีเซ็ตข้อมูล
- **หน้า "จัดงานรายเดือน"**: แสดงรายการการจัดงานทั้งหมด และ Form สำหรับสร้าง/แก้ไข
- **ปุ่ม "รีเซ็ตข้อมูล"**: ในหน้า Work Assignment สำหรับรีเซ็ตข้อมูล Manual
- **Modal ยืนยัน**: แสดง Modal ยืนยันก่อนรีเซ็ต
- **Progress Indicator**: แสดง Progress Indicator ขณะกำลังรีเซ็ต
- **ผลลัพธ์**: แสดงผลลัพธ์ (สำเร็จ/ล้มเหลว)

---

### 10. Accounting Fees - Excel Layout Pattern
- **โครงสร้าง**: 1 row = 1 ลูกค้า + 1 ปี, 12 columns = 12 เดือน (มกราคม-ธันวาคม)
- **ข้อดี**:
  - ตรงกับ Excel Layout ที่ผู้ใช้คุ้นเคย
  - Query ข้อมูลเดือนใดเดือนหนึ่งทำได้โดยตรง (ไม่ต้อง JOIN)
  - Frontend แสดงผลในรูปแบบ Table ได้ง่าย (12 columns)
  - เหมาะสำหรับการ Export เป็น Excel
- **ข้อควรระวัง**:
  - ถ้าต้องการเก็บข้อมูลหลายปี ต้องสร้าง row ใหม่สำหรับแต่ละปี
  - การ Query ข้อมูลข้ามปีต้องใช้ `UNION` หรือ Query หลาย rows
  - การ Aggregate ข้อมูล (เช่น SUM ทั้งปี) ต้อง Sum ทั้ง 12 columns
- **Frontend Display**: แสดงเป็น Table โดยมี 12 columns สำหรับ 12 เดือน (ตาม Excel Layout)

---

## 🚀 Next Steps

1. **สร้าง Migration Files**: สร้าง SQL migration files สำหรับแต่ละตาราง (รวม `work_assignments`)
2. **สร้าง API Routes**: 
   - สร้าง API endpoints สำหรับ CRUD operations ของทุกตาราง
   - สร้าง API endpoints สำหรับ Work Assignment (`/api/work-assignments`)
   - สร้าง API endpoints สำหรับรีเซ็ตข้อมูล (`/api/work-assignments/:id/reset-data`)
3. **สร้าง Work Assignment System**: 
   - สร้าง API endpoints สำหรับการจัดงานรายเดือน
   - สร้าง Logic สำหรับรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` เมื่อมีการจัดงานใหม่
   - สร้าง Frontend UI สำหรับ "จัดงานรายเดือน" (Admin/HR only)
4. **สร้าง Monthly Reset System**: 
   - สร้าง Scheduled Task/Cron Job สำหรับรีเซ็ตข้อมูลอัตโนมัติเมื่อเริ่มเดือนใหม่ (ถ้ายังไม่มีการจัดงาน)
   - สร้าง Frontend UI สำหรับรีเซ็ตข้อมูล Manual
5. **เชื่อมกับ Frontend**: อัพเดทหน้า UI (ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี, คีย์เอกสาร) ให้เชื่อมกับ API
6. **Documentation**: อัพเดท API documentation และ Page guidebooks

---

## 📋 Summary: Work Assignment & Monthly Reset System

### ระบบการจัดงานรายเดือน:
1. ✅ **work_assignments** - ข้อมูลการจัดงานรายเดือน
   - ผู้ใช้งาน (Admin/HR) จะเป็นคนกำหนดผู้รับผิดชอบแต่ละส่วนในแต่ละเดือน
   - มี `assignment_year` และ `assignment_month` สำหรับแยกข้อมูลแต่ละเดือน
   - ใช้ `UNIQUE KEY (build, assignment_year, assignment_month, deleted_at)` เพื่อป้องกันข้อมูลซ้ำ
   - เมื่อมีการจัดงานใหม่ ระบบจะรีเซ็ตข้อมูล `monthly_tax_data` และ `document_entry_work` อัตโนมัติ

### ตารางที่ถูกรีเซ็ตเมื่อมีการจัดงานใหม่:
1. ✅ **monthly_tax_data** - ข้อมูลภาษีรายเดือน
   - มี `tax_year` และ `tax_month` สำหรับแยกข้อมูลแต่ละเดือน
   - ใช้ `UNIQUE KEY (build, tax_year, tax_month, deleted_at)` เพื่อป้องกันข้อมูลซ้ำ
   - **รีเซ็ตเมื่อ**: มีการสร้าง/แก้ไข `work_assignments` สำหรับเดือนนั้น
   - ผู้รับผิดชอบแต่ละส่วนมาจาก `work_assignments`

2. ✅ **document_entry_work** - ข้อมูลงานคีย์เอกสาร
   - มี `work_year` และ `work_month` สำหรับแยกข้อมูลแต่ละเดือน
   - ใช้ `UNIQUE KEY (build, work_year, work_month, deleted_at)` เพื่อป้องกันข้อมูลซ้ำ
   - **รีเซ็ตเมื่อ**: มีการสร้าง/แก้ไข `work_assignments` สำหรับเดือนนั้น
   - ผู้รับผิดชอบในการคีย์มาจาก `work_assignments`

### ตารางที่ไม่ถูกรีเซ็ต:
- **accounting_fees** - ข้อมูลค่าทำบัญชี (อัพเดทในแต่ละเดือน แต่ไม่รีเซ็ต)
- **clients** - ข้อมูลลูกค้า (ข้อมูลคงที่)
- **dbd_info** - ข้อมูลกรมพัฒนาธุรกิจ (ข้อมูลคงที่)
- **boi_info** - ข้อมูลรับสิท BOI (ข้อมูลคงที่)
- **agency_credentials** - ข้อมูลรหัสแต่ละหน่วยงาน (ข้อมูลคงที่)

---

---

## 🔄 Workflow: การจัดงานและรีเซ็ตข้อมูลรายเดือน

### ขั้นตอนการทำงาน:

#### 1. ผู้ใช้งาน (Admin/HR) จัดงานรายเดือน
```
User → สร้าง/แก้ไข work_assignments
  ├── เลือก Build (ลูกค้า)
  ├── เลือก Year และ Month
  ├── กำหนดผู้รับผิดชอบแต่ละส่วน:
  │   ├── accounting_responsible (ทำบัญชี)
  │   ├── tax_inspection_responsible (ตรวจภาษี)
  │   ├── wht_filer_responsible (ยื่น WHT)
  │   ├── vat_filer_responsible (ยื่น VAT)
  │   └── document_entry_responsible (คีย์เอกสาร)
  └── บันทึกข้อมูล
```

#### 2. ระบบรีเซ็ตข้อมูลอัตโนมัติ
```
System → เมื่อบันทึก work_assignments สำเร็จ
  ├── ตรวจสอบว่ามีข้อมูล monthly_tax_data และ document_entry_work สำหรับเดือนนั้นอยู่หรือไม่
  ├── ถ้ามีอยู่แล้ว:
  │   ├── Soft Delete ข้อมูลเก่า (deleted_at = NOW())
  │   └── หรือ Reset ค่าเป็น NULL/Default
  ├── สร้างข้อมูลใหม่:
  │   ├── monthly_tax_data (ใช้ข้อมูลผู้รับผิดชอบจาก work_assignments)
  │   └── document_entry_work (ใช้ข้อมูลผู้รับผิดชอบจาก work_assignments)
  └── อัพเดท work_assignments:
      ├── is_reset_completed = TRUE
      └── reset_completed_at = NOW()
```

#### 3. พนักงานทำงานตามที่ได้รับมอบหมาย
```
Employee → ทำงานตามที่ได้รับมอบหมาย
  ├── ดูงานที่ได้รับมอบหมายจาก work_assignments
  ├── อัพเดทข้อมูลใน monthly_tax_data หรือ document_entry_work
  └── ระบบจะแสดงข้อมูลตามผู้รับผิดชอบที่กำหนดไว้
```

### ตัวอย่างการใช้งาน:

**Scenario 1: จัดงานใหม่สำหรับเดือนมกราคม 2026**
```sql
-- 1. สร้าง work_assignments
INSERT INTO work_assignments (
  build, assignment_year, assignment_month,
  accounting_responsible, tax_inspection_responsible,
  wht_filer_responsible, vat_filer_responsible,
  document_entry_responsible, assigned_by, assigned_at
) VALUES (
  '001', 2026, 1,
  'AC00010', 'AC00011', 'AC00012', 'AC00013', 'AC00014',
  'user-uuid-1', NOW()
);

-- 2. ระบบจะรีเซ็ตข้อมูลอัตโนมัติ:
--    - สร้าง monthly_tax_data ใหม่ (ใช้ข้อมูลผู้รับผิดชอบจาก work_assignments)
--    - สร้าง document_entry_work ใหม่ (ใช้ข้อมูลผู้รับผิดชอบจาก work_assignments)
```

**Scenario 2: แก้ไขการจัดงาน (เปลี่ยนผู้รับผิดชอบ)**
```sql
-- 1. แก้ไข work_assignments
UPDATE work_assignments
SET accounting_responsible = 'AC00020',
    updated_at = NOW()
WHERE build = '001' AND assignment_year = 2026 AND assignment_month = 1;

-- 2. ระบบจะรีเซ็ตข้อมูลอัตโนมัติ:
--    - Reset monthly_tax_data (อัพเดทผู้รับผิดชอบใหม่)
--    - Reset document_entry_work (อัพเดทผู้รับผิดชอบใหม่)
```

---

**Last Updated**: 2026-01-30  
**Reference**: `Documentation/Database/MyDatabase/work_flow.md`
