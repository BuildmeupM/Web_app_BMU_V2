# 🔍 09. Tax Inspection Page

## 📋 Overview

หน้าตรวจสอบเอกสารภาษี - ระบบตรวจภาษีที่ครอบคลุมทั้ง WHT และ VAT

**Route**: `/tax-inspection`  
**Component**: `src/pages/TaxInspection.tsx`

## 🔐 Access Control

- ✅ **admin**
- ✅ **audit**

## ✨ Features

### 1. Summary Card (สรุปงานที่รับผิดชอบ)
- ✅ แสดงสรุปสถานะ WHT และ VAT
- ✅ แสดงจำนวนงานที่รอตรวจ, รอตรวจอีกครั้ง, และตรวจแล้ว
- ✅ Color-coded badges (Orange, Red, Green)
- ✅ แต่ละส่วนมี border แยกชัดเจน (ใช้ Paper component with border)
- ✅ มี border-right สีส้ม (#ff6b35) แยกกลุ่ม WHT และ VAT (ระหว่าง index 2 และ 3)
- ✅ **การนับ "ตรวจแล้ว"**:
  - **ตรวจแล้ว (WHT)**: นับจาก `pnd_review_returned_date IS NOT NULL` (วันที่ส่งตรวจคืน ภงด.)
  - **ตรวจแล้ว (VAT)**: นับจาก `pp30_review_returned_date IS NOT NULL` (วันที่ส่งตรวจคืน ภ.พ. 30)
- ✅ **การนับ "รอตรวจ" และ "รอตรวจอีกครั้ง"**:
  - **รอตรวจ (WHT)**: นับจาก `pnd_status = 'pending_review'` เท่านั้น (สถานะ ภงด.)
  - **รอตรวจอีกครั้ง (WHT)**: นับจาก `pnd_status = 'pending_recheck'` เท่านั้น (สถานะ ภงด.)
  - **รอตรวจ (VAT)**: นับจากสถานะที่ derive จาก fields อื่นๆ (pp30_status ไม่มีในฐานข้อมูล)
    - เมื่อมี `pp30_sent_for_review_date` แต่ไม่มี `pp30_review_returned_date` และไม่มี `pp30_sent_to_customer_date` และไม่มี `pp30_filing_response`
  - **รอตรวจอีกครั้ง (VAT)**: นับจากสถานะที่ derive จาก fields อื่นๆ
    - เมื่อมี `pp30_review_returned_date` แต่ไม่มี `pp30_sent_to_customer_date` และไม่มี `pp30_filing_response`
- ✅ Filter โดย `tax_inspection_responsible` (employee_id ของผู้ใช้ที่ล็อกอิน) เพื่อแสดงเฉพาะงานที่รับผิดชอบ

### 2. Filter Section (ส่วนกรองข้อมูล) (FEATURE-007: ใช้ FilterSection แบบรวมร่วมกับหน้าสถานะยื่นภาษีและยื่นภาษี)
- ✅ **โหมดการแสดงผล**: ทั้งหมด, ภาษีหัก ณ ที่จ่าย, ภาษีมูลค่าเพิ่ม
- ✅ เลือกประเภทการกรอง: หมายเลข Build หรือ วันที่และเวลา
- ✅ **Date Range Picker**: เมื่อเลือกกรองตามวันที่
  - DatePickerInput สำหรับวันที่เริ่มต้น
  - DatePickerInput สำหรับวันที่สิ้นสุด (มี minDate เป็นวันที่เริ่มต้น)
  - รองรับการล้างค่า (clearable)
- ✅ **Search Input**: ค้นหาด้วยหมายเลข Build หรือชื่อบริษัท (เมื่อเลือกกรองตาม Build)
- ✅ **Status Filters (MultiSelect - สามารถเลือกได้หลายสถานะ)**:
  - **สถานะ WHT** รองรับตัวเลือกสถานะทั้งหมด 12 รายการ:
    - รับใบเสร็จแล้ว
    - ชำระแล้ว
    - ส่งลูกค้าแล้ว
    - ร่างแบบเสร็จแล้ว
    - ผ่าน
    - รอตรวจ
    - รอตรวจอีกครั้ง
    - ร่างแบบได้
    - แก้ไข
    - สอบถามลูกค้าเพิ่มเติม
    - ตรวจสอบเพิ่มเติม
    - สถานะยังไม่ดำเนินการ
  - **สถานะ ภ.พ.30** รองรับตัวเลือกสถานะทั้งหมด 12 รายการ (เหมือนสถานะ WHT)
  - **สถานะยอดชำระ ภ.พ.30**: มียอดชำระ, ไม่มียอดชำระ
  - **คุณสมบัติ MultiSelect**:
    - สามารถเลือกได้หลายสถานะพร้อมกัน
    - มี searchable เพื่อค้นหาสถานะที่ต้องการ
    - มี clearable เพื่อล้างการเลือกทั้งหมด
- ✅ **Active Filters Count Badge**: แสดงจำนวนตัวกรองที่ใช้งานอยู่
- ✅ **Filter Summary**: แสดงตัวกรองที่เลือกอยู่พร้อมปุ่มลบแต่ละตัว
  - แสดง Badge สำหรับแต่ละ filter ที่เลือก (รวมถึงโหมดการแสดงผล)
  - สามารถลบแต่ละ filter ได้โดยคลิกที่ปุ่ม X
  - แสดงวันที่ในรูปแบบ DD/MM/YYYY
- ✅ **Action Buttons**:
  - รีเฟรชข้อมูล
  - รีเซ็ตฟิลเตอร์ (ล้างการเลือกทั้งหมด, ปุ่มจะ disabled เมื่อไม่มี filter)
- ✅ **Filter Change Callback**: ส่ง filter values ไปยัง parent component เมื่อมีการเปลี่ยนแปลง
- ✅ **Component**: ใช้ `FilterSection` จาก `src/components/shared/FilterSection.tsx` (ใช้ร่วมกับหน้าสถานะยื่นภาษีและยื่นภาษี)

### 3. Tax Inspection Table (ตารางรายการตรวจภาษี)
- ✅ แสดงข้อมูล:
  - Build Number (Sticky column - ตรึงเมื่อ scroll แนวนอน)
  - ชื่อบริษัท (Sticky column - ตรึงเมื่อ scroll แนวนอน)
  - วันที่ส่งตรวจ ภงด. (PND)
  - สถานะ ภงด. (รองรับสถานะทั้งหมด 12 รายการ)
  - วันที่ส่งตรวจ ภ.พ. 30 (PP30)
  - แบบ ภ.พ.30 (รองรับสถานะทั้งหมด 12 รายการ)
  - สถานะยอดชำระ ภ.พ.30 (มียอดชำระ/ไม่มียอดชำระ)
  - ข้อมูลผู้รับผิดชอบ (แสดงหลายบรรทัด: ผู้ตรวจภาษี, พนักงานที่รับผิดชอบในการคีย์, พนักงานที่ยื่น WHT, พนักงานที่ยื่น VAT)
  - จัดการ (ปุ่มเลือกบริษัทนี้)
- ✅ **Status Badges: Color-coded badges สำหรับแต่ละสถานะ (ฟอนต์สีขาว)**
  - **รับใบเสร็จ**: สีฟ้า (#4facfe)
  - **ชำระแล้ว**: สีเหลือง (#ffc107)
  - **ส่งลูกค้าแล้ว**: สีฟ้าอ่อน (#81d4fa)
  - **ร่างแบบเสร็จแล้ว**: สีแดงอ่อน (#ffcdd2)
  - **ผ่าน**: สีเขียว (#4caf50)
  - **รอตรวจ**: สีส้ม (#ff6b35)
  - **รอตรวจอีกครั้ง**: สีแดง (#f44336)
  - **ร่างแบบได้**: สีแดงอ่อน (#ffcdd2)
  - **แก้ไข**: สีแดง (#f44336)
  - **สอบถามลูกค้าเพิ่มเติม**: สีม่วง (#9c27b0)
  - **ตรวจสอบเพิ่มเติม**: สีฟ้าอ่อน (#81d4fa)
  - **ไม่มียื่น**: สีเทา (#808080)
  - **สถานะยังไม่ดำเนินการ**: สีเทา (#808080)
- ✅ Hover Effects: Highlight row เมื่อ hover
- ✅ Sticky Columns: Build และ ชื่อบริษัท จะตรึงเมื่อ scroll แนวนอน
- ✅ Full Width Layout: Layout เต็มหน้าจอ (ไม่รองรับ mobile) เพื่อให้เห็นข้อมูลชัดเจนขึ้น
- ✅ Scrollable Table: มี horizontal scrollbar เมื่อข้อมูลกว้างเกินหน้าจอ

### 4. Pagination (การแบ่งหน้า)
- ✅ Items Per Page Selector (10, 20, 50, 100)
- ✅ Page Navigation (Previous, Page Numbers, Next)
- ✅ Display: แสดงจำนวนรายการที่แสดง (เช่น "แสดง 1-20 จาก 121 รายการ")
- ✅ Active Page Highlight: Highlight หน้าที่กำลังดู

### 5. Tax Inspection Form Modal (ฟอร์มสถานะภาษีประจำเดือน)
- ✅ Full Screen Modal
- ✅ Modal Title: "ฟอร์มสถานะภาษีประจำเดือน" (แสดงเหมือนกันทั้ง 3 หน้า: ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)
- ✅ Modal Header: แสดง Icon, Title และปุ่มรีเฟรชข้อมูล
  - **ปุ่มรีเฟรชข้อมูล** (FEATURE-006):
    - อยู่ด้านขวาของ title ใน header
    - แสดง icon refresh และข้อความ "รีเฟรชข้อมูล"
    - เมื่อกดปุ่มรีเฟรช ระบบจะ:
      - Invalidate cache ของ query เพื่อให้แน่ใจว่าได้ข้อมูลใหม่
      - Refetch ข้อมูลจากฐานข้อมูล
      - รีเซ็ต form state ทั้งหมดให้ตรงกับข้อมูลใหม่จากฐานข้อมูล
      - สถานะที่ผู้ใช้เปลี่ยนแต่ยังไม่ได้บันทึกจะถูก reset กลับไปเป็นสถานะจากฐานข้อมูล
    - แสดง loading state เมื่อกำลังโหลดข้อมูล
    - Disable เมื่อกำลังโหลดหรือไม่มี buildId
    - แสดง notification เมื่อรีเฟรชสำเร็จหรือเกิดข้อผิดพลาด
- ✅ **Company Information Section (Sticky Header)**:
  - แสดงข้อมูลบริษัทด้านบนของฟอร์มเสมอ (Sticky position)
  - ไม่ต้องเลื่อนลงเพื่อดูข้อมูลบริษัท
  - แสดงในรูปแบบ Grid (Responsive: 1-4 columns)
  - ข้อมูลที่แสดง:
    - Build Number
    - ชื่อบริษัท
    - เลขทะเบียนนิติบุคคล
    - สถานะจดทะเบียนภาษี
    - วันที่จดภาษีมูลค่าเพิ่ม
    - ไซต์บริษัท
    - ผู้ทำ
    - พนักงานที่รับผิดชอบในการคีย์
    - ที่อยู่บริษัท (แสดงเต็มความกว้างด้านล่าง)
  - Background: #fff8f5 (สีอ่อน)
  - Border: สีส้ม (#ff6b35)
  - **Typography**: 
    - Label: size="sm", fw={600}, c="gray.7"
    - Value: size="lg", fw={700}, c="dark.8"
    - Icon: size={20}
    - Spacing: mb={8} สำหรับ label, gap="sm" สำหรับ Group
- ✅ Tabs Navigation (3 Tabs - Full Width):
  - **ข้อมูลเกี่ยวกับการรับเอกสารและบริษัท** (พื้นหลังสีฟ้า #4facfe, ฟอนต์สีขาว):
    - **⚠️ Read-Only Mode**: เมื่อเปิดจากหน้าตรวจภาษี (Tax Inspection page) ส่วนนี้จะเป็น read-only ทั้งหมด (disabled) เพื่อป้องกันการแก้ไขข้อมูลจากทีมอื่น
    - **เอกสาร**: 
      - วันที่รับเอกสาร (DatePickerInput - สามารถเลือกหรือกรอกเองได้, read-only เมื่อเปิดจากหน้าตรวจภาษี)
      - สถานะเอกสาร (Select - 4 ตัวเลือก, read-only เมื่อเปิดจากหน้าตรวจภาษี):
        - รับครับแล้ว (พื้นหลังสีเขียว #4caf50, ฟอนต์สีขาว)
        - อยู่ระหว่างการขอ (พื้นหลังสีเหลือง #ffc107, ฟอนต์สีขาว)
        - ลูกค้าส่งเอกสารล้าช้า (พื้นหลังสีแดง #f44336, ฟอนต์สีขาว)
        - ลูกค้าไม่ตอบสนอง (พื้นหลังสีแดง #f44336, ฟอนต์สีขาว)
    - **ข้อมูลกระทบยอด**: 
      - สถานะบันทึกบัญชี (Select - 3 ตัวเลือก, read-only เมื่อเปิดจากหน้าตรวจภาษี):
        - เหลือมากกว่า 1 เดือน (พื้นหลังสีเหลือง #ffc107, ฟอนต์สีขาว)
        - บันทึกครบแล้ว (พื้นหลังสีเขียว #4caf50, ฟอนต์สีขาว)
        - ขาดเอกสารบางรายการ (พื้นหลังสีส้ม #ff6b35, ฟอนต์สีขาว)
        - ✅ **คำอธิบายสถานะ** (2026-02-04): มีปุ่มไอคอนข้อมูลที่คลิกได้เพื่อแสดงคำอธิบายความหมายของแต่ละตัวเลือก
      - สถานะสเตทเม้นท์ธนาคาร (Select - 4 ตัวเลือก, read-only เมื่อเปิดจากหน้าตรวจภาษี):
        - รับครับแล้ว (พื้นหลังสีเขียว #4caf50, ฟอนต์สีขาว)
        - อยู่ระหว่างการขอ (พื้นหลังสีเหลือง #ffc107, ฟอนต์สีขาว)
        - ลูกค้ายังไม่เปิดธนาคาร (พื้นหลังสีแดง #f44336, ฟอนต์สีขาว)
        - ลูกค้าไม่ตอบสนอง (พื้นหลังสีแดง #f44336, ฟอนต์สีขาว)
        - ✅ **คำอธิบายสถานะ** (2026-02-04): มีปุ่มไอคอนข้อมูลที่คลิกได้เพื่อแสดงคำอธิบายความหมายของแต่ละตัวเลือก
      - กระทบภาษีประจำเดือน (Select - 2 ตัวเลือก, read-only เมื่อเปิดจากหน้าตรวจภาษี):
        - กระทบแล้ว (พื้นหลังสีเขียว #4caf50, ฟอนต์สีขาว)
        - กระทบบางส่วน (พื้นหลังสีแดง #f44336, ฟอนต์สีขาว)
        - ✅ **คำอธิบายสถานะ** (2026-02-04): มีปุ่มไอคอนข้อมูลที่คลิกได้เพื่อแสดงคำอธิบายความหมายของแต่ละตัวเลือก
      - กระทบแบงค์ (Select - 4 ตัวเลือก, read-only เมื่อเปิดจากหน้าตรวจภาษี):
        - แบงค์ตรงทุกรายการ (พื้นหลังสีเขียว #4caf50, ฟอนต์สีขาว)
        - กระทบบางส่วน (พื้นหลังสีเหลือง #ffc107, ฟอนต์สีขาว)
        - ลูกค้ายังไม่เปิดธนาคาร (พื้นหลังสีแดง #f44336, ฟอนต์สีขาว)
        - ลูกค้ายังไม่ส่งเอกสาร (พื้นหลังสีแดง #f44336, ฟอนต์สีขาว)
        - ✅ **คำอธิบายสถานะ** (2026-02-04): มีปุ่มไอคอนข้อมูลที่คลิกได้เพื่อแสดงคำอธิบายความหมายของแต่ละตัวเลือก
  - **ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)** (พื้นหลังสีส้ม #ff6b35, ฟอนต์สีขาว):
    - **วันที่และเวลาสำหรับอัพเดทข้อมูล** (read-only):
      - วันที่ส่งตรวจ ภงด.
      - วันที่ส่งตรวจคืน ภงด.
      - วันที่ส่งลูกค้า ภงด.
      - วันที่ร่างแบบเสร็จแล้ว WHT
      - พนักงานที่ยื่นแบบภาษี WHT
    - **แบบฟอร์มภาษีหัก ณ ที่จ่าย**:
      - สถานะ ภงด. (Select - แสดงทุกสถานะที่อาจมีในฐานข้อมูล แต่ disable สถานะที่ไม่ให้เลือก)
      - แบบฟอร์มต่างๆ (10 แบบ): แบบ ภงด.1 40(1), แบบ ภงด.3, แบบ ภ.พ.36, แบบ ภงด.2, แบบ ภ.ธ.40, แบบ ภงด.1 40(2), แบบ ภงด.53, แบบ กยศ., แบบ ภงด.54, แบบ ประกันสังคม
      - แต่ละแบบมี Select (แสดงทุกสถานะที่อาจมีในฐานข้อมูล แต่ disable สถานะที่ไม่ให้เลือก) และจำนวนใบแนบ (number input)
      - **สถานะสำหรับหน้าตรวจภาษี**:
        - ✅ **เลือกได้**: `received_receipt`, `paid`, `passed`, `needs_correction`, `inquire_customer`, `additional_review`, `not_submitted`
        - ❌ **Disable (แสดงแต่เลือกไม่ได้)**: `pending_review`, `pending_recheck`, `draft_ready`, `sent_to_customer`, `draft_completed`, `not_started`
        - 📌 **สถานะเก่า (Backward Compatibility)**: `receipt`, `inquiry`, `review`, `edit` - แสดงเป็น "(ผู้ตรวจภาษี)" และ disabled
    - **สอบถามและตอบกลับ**:
      - Header อยู่ตรงกลาง (justify="center")
      - Card border เป็นค่าเริ่มต้น (withBorder)
      - Textarea ทั้งสองสามารถลากยาวลงได้โดยไม่กระทบกัน (align="stretch", wrapper styles)
      - "สอบถามเพิ่มเติม ภงด." - พื้นหลังขาว, ฟอนต์ดำ, แก้ไขได้
      - "ตอบกลับ ภงด." - พื้นหลังเทา (#808080), ฟอนต์ขาว, อ่านอย่างเดียว
      - สอบถามเพิ่มเติม ภงด. (Textarea - editable, พื้นหลังขาว, ตัวหนังสือดำ)
      - ตอบกลับ ภงด. (Textarea - read-only, พื้นหลังดำ, ตัวหนังสือขาว)
  - **ยื่นแบบภาษีมูลค่าเพิ่ม (VAT)** (พื้นหลังสีเขียว #4caf50, ฟอนต์สีขาว):
    - **วันที่และเวลาสำหรับอัพเดทข้อมูล** (5 ฟิลด์ read-only): วันที่ส่งตรวจ ภ.พ. 30, วันที่ส่งตรวจคืน ภ.พ. 30, วันที่ส่งลูกค้า ภ.พ. 30, วันที่ร่างแบบเสร็จแล้ว VAT, พนักงานที่ยื่นแบบภาษี VAT
    - **แบบฟอร์มภาษีมูลค่าเพิ่ม**:
      - สถานะ ภ.พ.30 (Select - แสดงทุกสถานะที่อาจมีในฐานข้อมูล แต่ disable สถานะที่ไม่ให้เลือก)
      - จำนวนเอกสารภาษีซื้อ (read-only)
      - **คอนเฟิร์มรายได้ (read-only สำหรับหน้าตรวจภาษี, editable สำหรับหน้าสถานะยื่นภาษี)**:
        - ✅ ดึงข้อมูลจากฐานข้อมูล (`income_confirmed` field)
        - ✅ แสดงข้อความตามค่าที่เลือก (map enum value เป็น label)
        - ✅ แสดงสีพื้นหลังตามค่าที่เลือก:
          - **ลูกค้าคอนเฟิร์ม**: สีเขียว (`#4caf50`)
          - **ไม่ต้องคอนเฟิร์มลูกค้า**: สีส้ม (`#ff6b35`)
          - **รอลูกค้าคอนเฟิร์ม**: สีเหลือง (`#ffc107`)
          - **ลูกค้าให้แก้รายได้**: สีแดง (`#f44336`)
        - ✅ ข้อความเป็นสีขาว (`#ffffff`) เมื่อมีสถานะ
        - ✅ Font weight: 500 เมื่อมีสถานะ
        - ✅ **คำอธิบายสถานะ** (2026-02-04):
          - มีปุ่มไอคอนข้อมูลที่คลิกได้เพื่อแสดงคำอธิบาย
          - หัวข้อ "คอนเฟิร์มรายได้" สามารถคลิกได้เพื่อเปิด/ปิดคำอธิบาย
          - คำอธิบายสำหรับสถานะ "ลูกค้าให้แก้รายได้": "คือสถานะที่จะถูกอัพเดตเมื่อมีการส่งตรวจรายได้ไปแล้ว ลูกค้าพึ่งจะมาแจ้งว่ามีรายได้ที่ยังตกหล่น หรือเพิ่มรายได้"
          - คำอธิบายแสดงใน Card สีส้มอ่อน (#fff3e0) พร้อมกรอบสีส้ม (#ff6b35) ด้านล่างของ Select field
      - **สถานะยอดชำระ ภ.พ.30** (Select - editable สำหรับหน้าสถานะยื่นภาษีและยื่นภาษี, read-only สำหรับหน้าตรวจภาษี):
        - ตัวเลือก: มียอดชำระ, ไม่มียอดชำระ
        - เมื่อเลือก "ไม่มียอดชำระ" จะล้างจำนวนยอดชำระอัตโนมัติ
      - **จำนวนยอดชำระ** (NumberInput - editable สำหรับหน้าสถานะยื่นภาษีและยื่นภาษี, read-only สำหรับหน้าตรวจภาษี):
        - บังคับกรอกเมื่อเลือก "มียอดชำระ"
        - รองรับทศนิยม 2 ตำแหน่ง (step: 0.01)
        - แสดง placeholder "0.00" เมื่อเลือก "มียอดชำระ", แสดง "--" เมื่อไม่ได้เลือก
        - Disabled เมื่อไม่ได้เลือก "มียอดชำระ" หรือเมื่อเปิดจากหน้าตรวจภาษี
      - **สถานะสำหรับหน้าตรวจภาษี**:
        - ✅ **เลือกได้**: `received_receipt`, `paid`, `passed`, `needs_correction`, `inquire_customer`, `additional_review`, `not_submitted`
        - ❌ **Disable (แสดงแต่เลือกไม่ได้)**: `pending_review`, `pending_recheck`, `draft_ready`, `sent_to_customer`, `draft_completed`, `not_started`
        - 📌 **สถานะเก่า (Backward Compatibility)**: `receipt`, `inquiry`, `review`, `edit` - แสดงเป็น "(ผู้ตรวจภาษี)" และ disabled
    - **สอบถามและตอบกลับ**:
      - สอบถามเพิ่มเติม ภ.พ.30 (Textarea - editable, พื้นหลังขาว, ตัวหนังสือดำ)
      - ตอบกลับ ภ.พ.30 (Textarea - read-only, พื้นหลังเทา #808080, ตัวหนังสือขาว)
- ✅ Form Fields:
  - TextInput สำหรับข้อมูลทั่วไป
  - Select สำหรับ dropdown
  - Textarea สำหรับข้อมูลยาว
  - Badge สำหรับสถานะ
- ✅ Action Buttons (Sticky Footer):
  - ยกเลิก
  - บันทึกข้อมูล
  - แสดงด้านล่างเสมอ (Sticky position)

## 🎨 UI/UX Guidelines

### Layout Structure

#### Main Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Header (Orange) - Full Width                               │
│  - Title: รายการตรวจภาษี                                    │
│  - Icons + Update Time                                      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Summary Card (Orange Header) - Full Width                  │
│  - สรุปงานที่รับผิดชอบ                                      │
│  - 6 Stats Cards (WHT + VAT) - Fixed 6 columns             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Filter Section - Full Width                                │
│  - Filter Type (Radio)                                       │
│  - Search + Status Dropdowns                                │
│  - Action Buttons                                           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Table - Full Width with Horizontal Scroll                 │
│  - Tax Inspection Records                                   │
│  - Sticky Columns: Build, ชื่อบริษัท                       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Pagination - Full Width                                    │
│  - Items Per Page + Page Nav                                │
└─────────────────────────────────────────────────────────────┘
```

**Layout Features:**
- ✅ **Full Width Layout**: ใช้ `Container fluid` เพื่อให้ layout เต็มหน้าจอ (ไม่รองรับ mobile)
- ✅ **Fixed Grid Columns**: Summary Card ใช้ `cols={6}` แทน responsive breakpoints
- ✅ **Sticky Columns**: Build และ ชื่อบริษัท จะตรึงเมื่อ scroll แนวนอน

#### Tax Inspection Form Modal Layout
```
┌─────────────────────────────────────┐
│  Modal Header (Orange #ff6b35)      │
│  - Title: ฟอร์มสถานะภาษีประจำเดือน │
│  - Refresh Button (รีเฟรชข้อมูล)    │
│  - Close Button (X)                 │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Company Info Section (Sticky Top)  │
│  - Background: #fff8f5               │
│  - Orange Header Bar                 │
│  - Grid Layout (1-4 columns)        │
│  - Company Data Fields               │
│  - Address (Full Width)              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Form Content (Scrollable)         │
│  - Tabs Navigation                  │
│  - Tab Panels:                      │
│    • ข้อมูลทั่วไป                   │
│    • ข้อมูลการยื่นภาษีมูลค่าเพิ่ม    │
│    • ข้อมูลลูกหนี้ ค.ศ. 30          │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  Action Buttons (Sticky Bottom)     │
│  - Background: #fff8f5               │
│  - ยกเลิก, บันทึกข้อมูล             │
└─────────────────────────────────────┘
```

### Color Scheme
- **Orange (#ff6b35, #ff8c42)**: 
  - Primary actions, Headers, Active states
  - Modal header background
  - Borders, Icons, Accents
  - Company info section header
  - Tab 2: "ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)" background
  - Status "รอตรวจ"
- **Light Orange (#fff8f5)**: 
  - Company info section background
  - Action buttons footer background
- **White**: 
  - Main background
  - Card backgrounds
  - Input fields
  - Tab text colors
  - Status Badge text color (ทุกสถานะ)
- **Blue (#4facfe)**: 
  - Tab 1: "ข้อมูลเกี่ยวกับการรับเอกสารและบริษัท" background
  - Status "รับใบเสร็จ" (Receipt)
- **Light Blue (#81d4fa)**: 
  - Status "ส่งลูกค้าแล้ว", "ตรวจสอบเพิ่มเติม"
- **Green (#4caf50)**: 
  - Tab 3: "ยื่นแบบภาษีมูลค่าเพิ่ม (VAT)" background
  - Status "ผ่าน"
- **Yellow (#ffc107)**: 
  - Status "ชำระแล้ว" (Paid)
- **Red (#f44336)**: 
  - Status "รอตรวจอีกครั้ง", "แก้ไข"
- **Light Red (#ffcdd2)**: 
  - Status "ร่างแบบเสร็จแล้ว", "ร่างแบบได้"
- **Purple (#9c27b0)**: 
  - Status "สอบถามลูกค้าเพิ่มเติม"
- **Gray (#808080)**: 
  - Status "ไม่มียื่น", "สถานะยังไม่ดำเนินการ"

### Components Used
- `Card` - สำหรับ Summary, Filter sections, และ Form sections
- `Paper` - สำหรับแสดง border รอบแต่ละส่วนของ Summary Card และ Filter Summary
- `Table` - สำหรับแสดงข้อมูล
- `Badge` - สำหรับสถานะและ Active Filters Count
- `Button` - สำหรับ Actions และ Quick Filter Buttons
- `Modal` - สำหรับ Form (Full Screen)
- `Tabs` - สำหรับ Form navigation
- `Select` / `MultiSelect` - สำหรับ Dropdowns และ Status Filters
- `TextInput` / `Textarea` - สำหรับ Form inputs
- `DatePickerInput` - สำหรับเลือกวันที่ (Date Range Picker)
- `SimpleGrid` - สำหรับ Company Info Grid Layout และ Summary Card Grid
- `ScrollArea` - สำหรับ Form Content ที่เลื่อนได้
- `Divider` - สำหรับแยกส่วน Address
- `Group` / `Stack` / `Flex` - สำหรับ Layout และ Spacing
- `Radio` / `Radio.Group` - สำหรับเลือกประเภทการกรอง

## 📊 Data Structure

### Tax Inspection Record
```typescript
interface TaxInspectionRecord {
  build: string
  companyName: string
  pndSentDate: string | null
  pndStatus:
    | 'received_receipt'
    | 'paid'
    | 'sent_to_customer'
    | 'draft_completed'
    | 'passed'
    | 'pending_review'
    | 'pending_recheck'
    | 'draft_ready'
    | 'needs_correction'
    | 'inquire_customer'
    | 'additional_review'
    | 'not_started'
    | null
  pp30SentDate: string | null
  pp30Status:
    | 'received_receipt'
    | 'paid'
    | 'sent_to_customer'
    | 'draft_completed'
    | 'passed'
    | 'pending_review'
    | 'pending_recheck'
    | 'draft_ready'
    | 'needs_correction'
    | 'inquire_customer'
    | 'additional_review'
    | 'not_submitted'
    | 'not_started'
    | null
  performer: string
}
```

### Summary Stats
```typescript
interface SummaryStat {
  label: string
  value: string
  total: string
  color: 'orange' | 'red' | 'green'
}
```

### Filter State
```typescript
interface FilterValues {
  filterType: 'build' | 'date'
  searchValue: string
  dateFrom: Date | null
  dateTo: Date | null
  whtStatus: string[]
  vatStatus: string[]
}
```

## 🔌 API Endpoints

### GET `/api/monthly-tax-data/summary`
**Query Parameters:**
- `year`: string (required) - ปีภาษี
- `month`: string (required) - เดือนภาษี
- `tax_inspection_responsible`: string (optional) - employee_id ของผู้ตรวจภาษี (สำหรับหน้าตรวจภาษี)

**Response:**
```json
{
  "success": true,
  "data": {
    "wht": {
      "pending": 0,
      "recheck": 0,
      "completed": 120,
      "total": 121
    },
    "vat": {
      "pending": 0,
      "recheck": 0,
      "completed": 84,
      "total": 84
    }
  }
}
```

**Logic การนับ (สำหรับหน้าตรวจภาษี):**
- **ตรวจแล้ว (WHT)**: นับจาก `pnd_review_returned_date IS NOT NULL`
- **ตรวจแล้ว (VAT)**: นับจาก `pp30_review_returned_date IS NOT NULL`
- **รอตรวจ (WHT)**: นับจาก `pnd_status = 'pending_review'` เท่านั้น (สถานะ ภงด.)
- **รอตรวจอีกครั้ง (WHT)**: นับจาก `pnd_status = 'pending_recheck'` เท่านั้น (สถานะ ภงด.)
- **รอตรวจ (VAT)**: นับจากสถานะที่ derive จาก fields อื่นๆ (pp30_status ไม่มีในฐานข้อมูล)
  - เมื่อมี `pp30_sent_for_review_date` แต่ไม่มี `pp30_review_returned_date` และไม่มี `pp30_sent_to_customer_date` และไม่มี `pp30_filing_response`
- **รอตรวจอีกครั้ง (VAT)**: นับจากสถานะที่ derive จาก fields อื่นๆ
  - เมื่อมี `pp30_review_returned_date` แต่ไม่มี `pp30_sent_to_customer_date` และไม่มี `pp30_filing_response`

### GET `/api/tax-inspection/list`
**Query Parameters:**
- `page`: number
- `limit`: number
- `filterType`: 'build' | 'date'
- `search`: string
- `whtStatus`: string
- `vatStatus`: string

**Response:**
```json
{
  "data": [
    {
      "build": "21",
      "companyName": "ไซม่อน อินเตอร์เนชั่นแนล โปรไวเดอร์",
      "pndSentDate": "12/01/2026 10:51",
      "pndStatus": "paid",
      "pp30SentDate": "22/01/2026 16:16",
      "pp30Status": "paid",
      "performer": "ครีม"
    }
  ],
  "total": 121,
  "page": 1,
  "limit": 20
}
```

### GET `/api/tax-inspection/:buildId`
**Response:**
```json
{
  "build": "315",
  "company": {
    "id": "315",
    "name": "ลิฟวิ่งโฮม แอนด์ เดคคอร์",
    "legalEntityNumber": "0105566235572",
    "address": "เลขที่1315/8 ซอย ประชาอุทิศ79 หมู่ ถนน แขวง/ตำบล ทุ่งครุ อำเภอ/เขต ทุ่งครุ จังหวัด กรุงเทพมหานคร รหัสไปรษณีย์",
    "taxRegistrationStatus": "จดภาษีมูลค่าเพิ่ม",
    "vatRegistrationDate": "11/11/2567",
    "website": "-",
    "preparedBy": "ชมพู่",
    "responsibleEmployee": "ซอคเกอร์",
    "status": "ยังไม่ตรวจสอบเอกสาร"
  },
  "vat": {
    "documentDate": null,
    "formType": null,
    "sales": null,
    "purchases": null
  }
}
```

### POST `/api/tax-inspection/:buildId`
**Request:**
```json
{
  "vat": {
    "documentDate": "2026-01-29",
    "formType": "pp30",
    "sales": "...",
    "purchases": "..."
  }
}
```

## ✅ Validation Rules

### Search Input
- ✅ Min length: 1 character
- ✅ Max length: 100 characters

### Form Fields
- ✅ Required fields: ตามที่กำหนดในแต่ละ Tab
- ✅ Date format: DD/MM/YYYY HH:mm
- ✅ VAT Registration: 13 digits

## 🚨 Error Handling

- ✅ Loading State: แสดง Loading เมื่อกำลังโหลดข้อมูล
- ✅ Empty State: แสดงข้อความเมื่อไม่มีข้อมูล
- ✅ Error State: แสดง Error message เมื่อเกิดข้อผิดพลาด
- ✅ Network Error: แสดงข้อความเมื่อไม่สามารถเชื่อมต่อ API

## 🔄 User Flow

```
1. User เข้าหน้าตรวจภาษี
2. แสดง Summary Card (สรุปงาน)
3. User สามารถ Filter และ Search
4. แสดง Table พร้อมข้อมูล
5. User คลิก "เลือกบริษัทนี้"
6. เปิด Form Modal (Full Screen)
7. แสดงข้อมูลบริษัทด้านบน (Sticky - ไม่ต้องเลื่อน)
   - User เห็นข้อมูลบริษัททันทีโดยไม่ต้องเลื่อนลง
8. User กรอกข้อมูลใน Tabs ต่างๆ
   - ข้อมูลทั่วไป
   - ข้อมูลการยื่นภาษีมูลค่าเพิ่ม (VAT)
   - ข้อมูลลูกหนี้ ค.ศ. 30
9. User คลิก "บันทึกข้อมูล" (Sticky Footer)
10. บันทึกข้อมูลและปิด Modal
11. Refresh Table เพื่อแสดงข้อมูลใหม่
```

## 🔄 Recent Updates

### ✅ Feature Update: แสดงทุกสถานะในฐานข้อมูล แต่ disable สถานะที่ไม่ให้เลือก (2026-02-02)
- **ปัญหา**: ฟอร์มไม่แสดงสถานะบางสถานะที่อาจมีในฐานข้อมูล ทำให้ผู้ใช้ไม่เห็นสถานะทั้งหมด
- **แก้ไข**: 
  - เพิ่มสถานะทั้งหมดที่อาจมีในฐานข้อมูลเข้าไปใน statusOptions
  - Disable สถานะที่ไม่ให้เลือกตาม role (แสดงแต่เลือกไม่ได้)
  - เพิ่มสถานะเก่า (backward compatibility) เพื่อรองรับข้อมูลเก่าในฐานข้อมูล
- **ผลลัพธ์**:
  - ✅ ผู้ใช้เห็นสถานะทั้งหมดที่อาจมีในฐานข้อมูล
  - ✅ สถานะที่ไม่ให้เลือกจะถูก disable แต่ยังแสดงใน dropdown
  - ✅ สถานะเก่าแสดงเป็น "(ผู้ตรวจภาษี)" แทน "(เก่า)" เพื่อให้ชัดเจนว่าเป็นสถานะที่ผู้ตรวจภาษีใช้

### ✅ Feature Update: แก้ไขคำว่า "(เก่า)" เป็น "(ผู้ตรวจภาษี)" (2026-02-02)
- **ปัญหา**: สถานะเก่าแสดงคำว่า "(เก่า)" ซึ่งไม่ชัดเจนว่าเป็นสถานะของผู้ตรวจภาษี
- **แก้ไข**: เปลี่ยน label ของสถานะเก่า (`receipt`, `inquiry`, `review`, `edit`) จาก "(เก่า)" เป็น "(ผู้ตรวจภาษี)"
- **ผลลัพธ์**:
  - ✅ สถานะเก่าจะแสดงเป็น "(ผู้ตรวจภาษี)" เพื่อให้ชัดเจนว่าเป็นสถานะที่ผู้ตรวจภาษีใช้
  - ✅ ค่าในฐานข้อมูลยังคงเป็น `value` (เช่น `'edit'`) ไม่ใช่ `label` (เช่น `'แก้ไข (ผู้ตรวจภาษี)'`)

## 📝 Implementation Notes

### Components Structure
```
src/components/TaxInspection/
├── SummaryCard.tsx          # Summary Card Component
├── FilterSection.tsx        # Filter Section Component
├── TaxInspectionTable.tsx   # Table Component
├── PaginationSection.tsx    # Pagination Component
└── TaxInspectionForm.tsx    # Form Modal Component
```

### State Management
- ✅ ใช้ `useState` สำหรับ local state
- ✅ Filter state, Pagination state
- ✅ Form state (เมื่อเปิด Modal)

### Status Options Management
- ✅ **แสดงทุกสถานะ**: ระบบจะแสดงทุกสถานะที่อาจมีในฐานข้อมูล เพื่อให้ผู้ใช้เห็นสถานะทั้งหมดแม้ว่าจะไม่สามารถเลือกได้
- ✅ **Role-based Selection**: สถานะที่เลือกได้จะแตกต่างกันตาม role:
  - **หน้าตรวจภาษี** (`taxInspection`): ผู้ตรวจภาษีสามารถเลือกได้เฉพาะสถานะที่ผู้ตรวจใช้
  - **หน้าสถานะยื่นภาษี** (`taxStatus`): ผู้ทำบัญชีสามารถเลือกได้เฉพาะสถานะที่ผู้ทำบัญชีใช้
  - **หน้ายื่นภาษี** (`taxFiling`): พนักงานยื่นภาษีสามารถเลือกได้เฉพาะสถานะที่พนักงานยื่นใช้
- ✅ **Disabled Status**: สถานะที่ไม่ให้เลือกจะถูก disable แต่ยังแสดงใน dropdown เพื่อให้เห็นค่าจากฐานข้อมูล
- ✅ **Backward Compatibility**: สถานะเก่า (`receipt`, `inquiry`, `review`, `edit`) จะแสดงเป็น "(ผู้ตรวจภาษี)" และ disabled เพื่อรองรับข้อมูลเก่าในฐานข้อมูล
- ⚠️ **สำคัญ**: `label` เป็นแค่ข้อความที่แสดงใน UI เท่านั้น ค่าที่ส่งไปยังฐานข้อมูลคือ `value` (เช่น `'edit'`, `'receipt'`) ไม่ใช่ `label`

### Data Fetching
- ✅ ใช้ React Query สำหรับ data fetching
- ✅ Cache และ Refetch เมื่อจำเป็น

## 🎯 Next Steps

- [ ] เชื่อมต่อ Backend API
- [ ] เพิ่ม Real-time Updates
- [ ] เพิ่ม Export Functions (PDF, Excel)
- [ ] เพิ่ม Advanced Filters
- [ ] เพิ่ม Bulk Actions
- [ ] เพิ่ม History/Logs

---

## 📝 Recent Updates

### 2026-02-03 (FEATURE-007: ปรับการกรองข้อมูลให้ตรงกันทั้ง 3 หน้า)
- ✅ สร้าง FilterSection แบบรวมที่ใช้ร่วมกันทั้ง 3 หน้า (ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)
- ✅ เพิ่มโหมดการแสดงผล (ทั้งหมด, ภาษีหัก ณ ที่จ่าย, ภาษีมูลค่าเพิ่ม) ในทุกหน้า
- ✅ เพิ่มสถานะยอดชำระ ภ.พ.30 ในทุกหน้า
- ✅ เปลี่ยนชื่อจาก "สถานะ VAT" เป็น "สถานะ ภ.พ.30" เพื่อให้ชัดเจน
- ✅ ใช้ FilterSection จาก `src/components/shared/FilterSection.tsx` แทน FilterSection แยกของแต่ละหน้า

### 2026-02-03 (FEATURE-006: เพิ่มปุ่มรีเฟรชข้อมูล)
- ✅ เพิ่มปุ่ม "รีเฟรชข้อมูล" ใน header ของฟอร์มสถานะภาษีประจำเดือน
- ✅ เมื่อกดปุ่มรีเฟรช ระบบจะดึงข้อมูลใหม่จากฐานข้อมูลและรีเซ็ต form state ทั้งหมด
- ✅ สถานะที่ผู้ใช้เปลี่ยนแต่ยังไม่ได้บันทึกจะถูก reset กลับไปเป็นสถานะจากฐานข้อมูล
- ✅ แสดง loading state และ notification เมื่อรีเฟรชสำเร็จหรือเกิดข้อผิดพลาด

### 2026-01-29 (ตอนค่ำ - ลบปุ่มใน Modal Header)
- ✅ ลบปุ่ม X และ Help ออกจาก Modal Header
- ✅ Modal Header แสดงเฉพาะ Icon และ Title เท่านั้น
- ✅ ใช้ปุ่ม Close ของ Modal (X) ที่ Mantine จัดให้อัตโนมัติ

### 2026-01-29 (ตอนค่ำ - เปลี่ยนชื่อ Modal Title)
- ✅ เปลี่ยนชื่อ Modal Title จาก "ฟอร์มตรวจภาษี" เป็น "ฟอร์มสถานะภาษีประจำเดือน"
- ✅ แสดงชื่อเดียวกันทั้ง 3 หน้า: ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี
- ✅ เพื่อให้สอดคล้องกับการใช้งานในทุกหน้า

### 2026-01-29 (ตอนค่ำ - เพิ่ม Read-Only Mode สำหรับหน้าตรวจภาษี)
- ✅ เพิ่ม Read-Only Mode สำหรับ Tab "ข้อมูลเกี่ยวกับการรับเอกสารและบริษัท":
  - เมื่อเปิดฟอร์มตรวจภาษีจากหน้าตรวจภาษี (Tax Inspection page) ส่วนนี้จะเป็น read-only ทั้งหมด
- ✅ **เพิ่ม Read-Only Mode สำหรับฟิลด์จำนวนใบแนบและข้อมูล VAT**:
  - **จำนวนใบแนบทั้งหมดใน Tab 2: ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)** - ทั้ง 10 ฟิลด์:
    - จำนวนใบแนบ แบบ ภงด.1 40(1)
    - จำนวนใบแนบ แบบ ภงด.3
    - จำนวนใบแนบ แบบ ภ.พ.36
    - จำนวนใบแนบ แบบ ประกันสังคม
    - จำนวนใบแนบ แบบ ภ.ธ.40
    - จำนวนใบแนบ แบบ ภงด.1 40(2)
    - จำนวนใบแนบ แบบ ภงด.53
    - จำนวนใบแนบ แบบ ภงด.54
    - จำนวนใบแนบ แบบ กยศ.
    - จำนวนใบแนบ แบบ ภงด.2
  - **จำนวนเอกสารภาษีซื้อ และ คอนเฟิร์มรายได้** ใน Tab 3: ยื่นแบบภาษีมูลค่าเพิ่ม (VAT)
  - เมื่อเปิดฟอร์มจากหน้าตรวจภาษี (`sourcePage="taxInspection"`):
    - ฟิลด์เหล่านี้จะเป็น read-only ทั้งหมด
    - พื้นหลังสีเทา (#f5f5f5)
    - cursor: not-allowed
  - เมื่อเปิดฟอร์มจากหน้าอื่น (สถานะยื่นภาษี, ยื่นภาษี):
    - ฟิลด์เหล่านี้สามารถกรอกได้
    - พื้นหลังสีขาว (#ffffff)
  - เพิ่ม prop `readOnlyGeneralInfo` ใน TaxInspectionForm component
  - ตั้งค่า `readOnlyGeneralInfo={true}` เมื่อเปิดจาก TaxInspection.tsx
  - Fields ทั้งหมด (DatePickerInput และ Select) จะเป็น disabled และ read-only
  - ป้องกันการแก้ไขข้อมูลจากทีมอื่น (เพราะเป็นการทำงานคนละทีมกัน)
  - ยังคงแสดงข้อมูลได้ตามปกติ แต่ไม่สามารถแก้ไขได้
  - Cursor จะแสดงเป็น `not-allowed` เมื่อ hover

### 2026-01-29 (ตอนค่ำ - พัฒนา Tab ข้อมูลเกี่ยวกับการรับเอกสารและบริษัท)
- ✅ ปรับปรุง Tab "ข้อมูลเกี่ยวกับการรับเอกสารและบริษัท":
  - **วันที่รับเอกสาร**: เปลี่ยนจาก TextInput read-only เป็น DatePickerInput ที่สามารถเลือกหรือกรอกเองได้
  - **สถานะเอกสาร**: เปลี่ยนเป็น Select พร้อม 4 ตัวเลือก:
    - รับครับแล้ว (เขียว)
    - อยู่ระหว่างการขอ (เหลือง)
    - ลูกค้าส่งเอกสารล้าช้า (แดง)
    - ลูกค้าไม่ตอบสนอง (แดง)
  - **สถานะบันทึกบัญชี**: เปลี่ยนเป็น Select พร้อม 3 ตัวเลือก:
    - เหลือมากกว่า 1 เดือน (เหลือง)
    - บันทึกครบแล้ว (เขียว)
    - ขาดเอกสารบางรายการ (ส้ม)
  - **สถานะสเตทเม้นท์ธนาคาร**: เปลี่ยนเป็น Select พร้อม 4 ตัวเลือก:
    - รับครับแล้ว (เขียว)
    - อยู่ระหว่างการขอ (เหลือง)
    - ลูกค้ายังไม่เปิดธนาคาร (แดง)
    - ลูกค้าไม่ตอบสนอง (แดง)
  - **กระทบภาษีประจำเดือน**: เปลี่ยนเป็น Select พร้อม 2 ตัวเลือก:
    - กระทบแล้ว (เขียว)
    - กระทบบางส่วน (แดง)
  - **กระทบแบงค์**: เปลี่ยนเป็น Select พร้อม 4 ตัวเลือก:
    - แบงค์ตรงทุกรายการ (เขียว)
    - กระทบบางส่วน (เหลือง)
    - ลูกค้ายังไม่เปิดธนาคาร (แดง)
    - ลูกค้ายังไม่ส่งเอกสาร (แดง)
  - ทุก Select มีพื้นหลังสีตามสถานะที่เลือก และฟอนต์สีขาว
  - รองรับการล้างค่า (clearable) และค้นหา (searchable)

### 2026-01-29 (ตอนค่ำ - ปรับปรุงข้อมูลบริษัท)
- ✅ ปรับปรุงส่วนข้อมูลบริษัทให้ชัดเจนขึ้น:
  - เพิ่มขนาด Label จาก size="xs" เป็น size="sm"
  - เพิ่มขนาด Value จาก size="sm" เป็น size="lg"
  - เพิ่ม Font Weight ของ Value เป็น fw={700}
  - เพิ่มขนาด Icon จาก 16 เป็น 20
  - เพิ่ม Spacing: mb={8} สำหรับ label, gap="sm" สำหรับ Group
  - ปรับสี Label จาก c="dimmed" เป็น c="gray.7"
  - ปรับสี Value เป็น c="dark.8" เพื่อให้อ่านง่ายขึ้น
  - เพิ่มขนาด Divider และ spacing สำหรับ Address section

### 2026-01-29 (ตอนค่ำ - ปรับสี Status Badges)
- ✅ ปรับสี Status Badges ในตารางให้ตรงตามที่กำหนด
  - รับใบเสร็จ: สีฟ้า (#4facfe)
  - ชำระแล้ว: สีเหลือง (#ffc107)
  - ส่งลูกค้าแล้ว: สีฟ้าอ่อน (#81d4fa)
  - ร่างแบบเสร็จแล้ว: สีแดงอ่อน (#ffcdd2)
  - ผ่าน: สีเขียว (#4caf50)
  - รอตรวจ: สีส้ม (#ff6b35)
  - รอตรวจอีกครั้ง: สีแดง (#f44336)
  - ร่างแบบได้: สีแดงอ่อน (#ffcdd2)
  - แก้ไข: สีแดง (#f44336)
  - สอบถามลูกค้าเพิ่มเติม: สีม่วง (#9c27b0)
  - ตรวจสอบเพิ่มเติม: สีฟ้าอ่อน (#81d4fa)
  - ไม่มียื่น: สีเทา (#808080)
  - สถานะยังไม่ดำเนินการ: สีเทา (#808080)
- ✅ ตั้งค่าฟอนต์สีขาวสำหรับทุก Status Badge
- ✅ รองรับสถานะทั้งหมด 12 รายการในตาราง
- ✅ สร้าง helper functions: getStatusColor() และ getStatusLabel()

### 2026-01-29 (ตอนค่ำ - เพิ่ม Features การกรองข้อมูล)
- ✅ เพิ่ม Date Range Picker สำหรับกรองตามวันที่
  - DatePickerInput สำหรับวันที่เริ่มต้นและวันที่สิ้นสุด
  - มี minDate validation (วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น)
  - รองรับการล้างค่า (clearable)
- ✅ เพิ่ม Quick Filter Buttons สำหรับกรองสถานะที่ใช้บ่อย
  - ปุ่ม "รอตรวจ", "รอตรวจอีกครั้ง", "ตรวจแล้ว"
  - คลิกเพื่อเลือกสถานะ WHT และ VAT พร้อมกัน
- ✅ เพิ่ม Active Filters Count Badge
  - แสดงจำนวนตัวกรองที่ใช้งานอยู่ด้านบนขวา
  - อัปเดตแบบ real-time เมื่อมีการเปลี่ยนแปลง filter
- ✅ เพิ่ม Filter Summary Section
  - แสดงตัวกรองที่เลือกอยู่ทั้งหมด
  - แต่ละ filter แสดงเป็น Badge พร้อมปุ่ม X เพื่อลบ
  - รองรับการลบแต่ละ filter แยกกัน
  - แสดงวันที่ในรูปแบบ DD/MM/YYYY
- ✅ เพิ่ม Filter Change Callback
  - ส่ง filter values ไปยัง parent component เมื่อมีการเปลี่ยนแปลง
  - รองรับการใช้งานผ่าน onFilterChange prop
- ✅ ปรับปรุงปุ่มรีเซ็ตฟิลเตอร์
  - ปุ่มจะ disabled เมื่อไม่มี filter ที่เลือก
  - รีเซ็ตทุก filter รวมถึง date range

### 2026-01-29 (ตอนค่ำ - ปรับปุ่ม)
- ✅ ปรับปุ่มทั้งหมดให้มีพื้นหลังสีส้มและฟอนต์สีขาว
  - ปุ่ม "รีเฟรชข้อมูล" และ "รีเซ็ตฟิลเตอร์" ใน Filter Section: เปลี่ยนจาก variant="light" color="blue" เป็น variant="filled" color="orange" พร้อมพื้นหลังสีส้ม (#ff6b35) และฟอนต์สีขาว
  - ปุ่ม "เลือกบริษัทนี้" ในตาราง: เปลี่ยนจาก variant="light" color="blue" เป็น variant="filled" color="orange" พร้อมพื้นหลังสีส้ม (#ff6b35) และฟอนต์สีขาว
  - เพื่อให้สอดคล้องกับธีมสีส้มของระบบ

### 2026-01-29 (ตอนค่ำ)
- ✅ เพิ่ม border รอบแต่ละส่วนของ Summary Card
  - แต่ละ status indicator (Badge + Text) มี border สีดำ (#000000) แยกชัดเจน
  - ใช้ Paper component with border เพื่อแสดงขอบเส้น
  - ทุกส่วนมี border สีดำขนาด 1px เท่ากันทั้งหมด เพื่อความสม่ำเสมอ
  - ปรับ padding และ border-radius เพื่อให้ดูสวยงามและอ่านง่ายขึ้น

### 2026-01-29 (ตอนเย็น)
- ✅ ปรับปรุง Filter Section: เปลี่ยนจาก Select เป็น MultiSelect
  - สถานะ WHT และ VAT สามารถเลือกได้หลายสถานะพร้อมกัน
  - เพิ่มตัวเลือกสถานะทั้งหมด 12 รายการ:
    - รับใบเสร็จ, ชำระแล้ว, ส่งลูกค้าแล้ว, ร่างแบบเสร็จแล้ว, ผ่าน, รอตรวจ, รอตรวจอีกครั้ง, ร่างแบบได้, แก้ไข, สอบถามลูกค้าเพิ่มเติม, ตรวจสอบเพิ่มเติม, สถานะยังไม่ดำเนินการ
  - เพิ่มคุณสมบัติ searchable และ clearable สำหรับ MultiSelect
  - ปรับ placeholder เป็น "เลือกสถานะที่ต้องการกรอง"
  - ปรับ state management จาก string | null เป็น string[] (array)

### 2026-01-29
- ✅ เพิ่มส่วนแสดงข้อมูลบริษัทด้านบนของฟอร์ม (Sticky position)
- ✅ ปรับธีมเป็นส้ม-ขาว (#ff6b35, #ff8c42) ทั้งหมด
- ✅ ปรับปรุง UI ให้สวยงามขึ้นด้วย shadows และ borders
- ✅ เพิ่ม ScrollArea สำหรับ Form Content
- ✅ เพิ่ม Sticky Footer สำหรับ Action Buttons
- ✅ แก้ไข JSX Parsing Error (BUG-001)
- ✅ ปรับชื่อ Tabs และสีพื้นหลัง:
  - Tab 1: "ข้อมูลเกี่ยวกับการรับเอกสารและบริษัท" (พื้นหลังสีฟ้า #4facfe, ฟอนต์สีขาว)
  - Tab 2: "ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)" (พื้นหลังสีส้ม #ff6b35, ฟอนต์สีขาว)
  - Tab 3: "ยื่นแบบภาษีมูลค่าเพิ่ม (VAT)" (พื้นหลังสีเขียว #4caf50, ฟอนต์สีขาว)
- ✅ ปรับ Tabs ให้แสดงผลเต็มความกว้าง (3 แถบพอดี)
- ✅ ลบปุ่ม Square และ Plus ออกจาก Modal Header (เหลือแค่ X และ Help)
- ✅ เพิ่มหัวข้อ "เอกสาร" ใน Tab 1:
  - วันที่รับเอกสาร (read-only, แสดงข้อมูลเท่านั้น)
  - สถานะเอกสาร (read-only, แสดงข้อมูลเท่านั้น)
- ✅ เพิ่มหัวข้อ "ข้อมูลกระทบยอด" ใน Tab 1:
  - สถานะบันทึกบัญชี (read-only)
  - สถานะสเตทเม้นท์ธนาคาร (read-only)
  - กระทบภาษีประจำเดือน (read-only)
  - กระทบแบงค์ (read-only)
- ✅ ลบส่วน "ข้อมูลเกี่ยวกับการยื่นภาษี" ออกจาก Tab 1
- ✅ ลบส่วน "Existing Information Sections" ออกจาก Tab 1:
  - สถานะเอกสาร (Badge)
  - ผู้ดูและ
  - วันที่มีการอนุมัติเอกสาร
  - พนักงานที่รับผิดชอบในการตรวจสอบ
  - ช่องไฟล์
- ✅ ปรับปรุง Tab 2 "ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)":
  - เพิ่มส่วน "วันที่และเวลาสำหรับอัพเดทข้อมูล" (5 ฟิลด์ read-only): วันที่ส่งตรวจ ภงด., วันที่ส่งตรวจคืน ภงด., วันที่ส่งลูกค้า ภงด., วันที่ร่างแบบเสร็จแล้ว WHT, พนักงานที่ยื่นแบบภาษี WHT
  - สลับตำแหน่ง "พนักงานที่ยื่นแบบภาษี" กับ "วันที่ร่างแบบเสร็จแล้ว WHT" (ให้ "วันที่ร่างแบบเสร็จแล้ว WHT" มาก่อน)
  - แก้ไข label "พนักงานที่ยื่นแบบภาษี" เป็น "พนักงานที่ยื่นแบบภาษี WHT"
  - เพิ่มส่วน "แบบฟอร์มภาษีหัก ณ ที่จ่าย" (10 แบบฟอร์ม พร้อม Select และจำนวนใบแนบ)
  - เพิ่มส่วน "สอบถามและตอบกลับ" (2 Textarea)
  - ลบข้อมูลเดิมทั้งหมดออก (วันที่รับเอกสาร ก.ค. 30, แบบ ภ.พ. 30, ยอดขายที่ได้, ยอดซื้อ, สรุปรายงานเพิ่มเติม)
- ✅ สลับตำแหน่งแบบฟอร์มภาษีหัก ณ ที่จ่าย:
  - แบบ ภงด.2 สลับกับ แบบ ประกันสังคม
  - แบบ กยศ. สลับกับ แบบ ภงด.54
- ✅ เพิ่มสถานะ "ไม่มียื่น" และปรับสีพื้นหลังตามสถานะ:
  - ไม่มียื่น: พื้นหลังดำ (#000000), ฟอนต์ขาว
  - รับใบเสร็จ: พื้นหลังฟ้า (#4facfe), ฟอนต์ขาว
  - ชำระแล้ว: พื้นหลังเหลือง (#ffc107), ฟอนต์ขาว
  - ผ่าน: พื้นหลังเขียว (#4caf50), ฟอนต์ขาว
  - แก้ไข: พื้นหลังแดง (#f44336), ฟอนต์ขาว
  - สอบถามลูกค้าเพิ่มเติม: พื้นหลังม่วง (#9c27b0), ฟอนต์ขาว
  - ตรวจสอบเพิ่มเติม: พื้นหลังฟ้าอ่อน (#81d4fa), ฟอนต์ขาว
- ✅ ปรับ label ทั้งหมดให้อยู่ตรงกลาง (textAlign: center)
- ✅ เพิ่มสีขอบส้มเมื่อกรอกจำนวนใบแนบ (borderColor: #ff6b35, borderWidth: 2px)
- ✅ ปรับ Textarea ให้ resizable (autosize, resize="vertical")
- ✅ ปรับส่วน "สอบถามและตอบกลับ":
  - ปรับ header ให้อยู่ตรงกลาง (justify="center")
  - ปรับ Card border เป็นค่าเริ่มต้น (ลบ borderLeft และ boxShadow custom)
  - ปรับ Textarea ให้ลากยาวลงได้โดยไม่กระทบกัน (align="stretch", wrapper styles)
  - เปลี่ยนพื้นหลัง "ตอบกลับ ภงด." จากสีดำเป็นสีเทา (#808080)
- ✅ เพิ่มเนื้อหาให้ Tab 3 "ยื่นแบบภาษีมูลค่าเพิ่ม (VAT)":
  - ลบส่วน "ข้อมูลลูกหนี้ ค.ศ. 30" ออก
  - เพิ่มส่วน "วันที่และเวลาสำหรับอัพเดทข้อมูล" (5 ฟิลด์ read-only, อยู่กึ่งกลาง): วันที่ส่งตรวจ ภ.พ. 30, วันที่ส่งตรวจคืน ภ.พ. 30, วันที่ส่งลูกค้า ภ.พ. 30, วันที่ร่างแบบเสร็จแล้ว VAT, พนักงานที่ยื่นแบบภาษี VAT
- ✅ ปรับปรุง Tab 2 "ยื่นแบบภาษีหัก ณ ที่จ่าย (WHT)":
  - สลับตำแหน่ง "พนักงานที่ยื่นแบบภาษี" กับ "วันที่ร่างแบบเสร็จแล้ว WHT" (ให้ "วันที่ร่างแบบเสร็จแล้ว WHT" มาก่อน)
  - แก้ไข label "พนักงานที่ยื่นแบบภาษี" เป็น "พนักงานที่ยื่นแบบภาษี WHT"
  - เพิ่มส่วน "แบบฟอร์มภาษีมูลค่าเพิ่ม":
    - สถานะ ภ.พ.30 (Select with status styling - เหมือนกับ WHT tab, มีกรอบสีดำเมื่อยังไม่เลือก)
    - จำนวนเอกสารภาษีซื้อ (read-only, อยู่กึ่งกลาง)
    - คอนเฟิร์มรายได้ (read-only, อยู่กึ่งกลาง)
  - เพิ่มส่วน "สอบถามและตอบกลับ" (เหมือนกับ WHT tab):
    - สอบถามเพิ่มเติม ภพ.30 (Textarea - editable, พื้นหลังขาว, ตัวหนังสือดำ)
    - ตอบกลับ ภพ.30 (Textarea - read-only, พื้นหลังเทา #808080, ตัวหนังสือขาว)
  - ทุก label และ input อยู่ตรงกลาง
  - ใช้สีเขียว (#4caf50) เป็นธีมหลัก

---

## 📝 Recent Updates (2026-02-02)

### ✅ Feature Update: ปรับปรุงการดึงข้อมูลและแสดงสีของ "คอนเฟิร์มรายได้"
- **วันที่แก้ไข**: 2026-02-02
- **ส่วน/หน้าที่เกี่ยวข้อง**: Tax Inspection Form (`src/components/TaxInspection/TaxInspectionForm.tsx`)
- **ระดับความรุนแรง**: Medium (Feature Enhancement)
- **คำอธิบายปัญหา**: 
  - ระบบไม่แสดงข้อมูล "คอนเฟิร์มรายได้" จากฐานข้อมูล
  - ไม่มีการแสดงสีตามค่าที่เลือก
- **วิธีแก้ไข**: 
  - แก้ไขการ initialize form ให้ map `income_confirmed` (enum value) เป็น label แล้ว set ให้ `confirmIncome` state
  - ปรับ TextInput ให้แสดงสีพื้นหลังตามค่าที่เลือกโดยใช้ `getConfirmIncomeColor(confirmIncomeStatus)`
  - ปรับข้อความเป็นสีขาว (`#ffffff`) เมื่อมีสถานะ
  - เพิ่ม `fontWeight: 500` เมื่อมีสถานะ
- **ไฟล์ที่แก้ไข**: 
  - `src/components/TaxInspection/TaxInspectionForm.tsx`
    - แก้ไขการ initialize `confirmIncome` จาก `income_confirmed` (บรรทัด 585-593)
    - ปรับ TextInput styles สำหรับหน้าสถานะยื่นภาษี (บรรทัด 2966-2984)
    - ปรับ TextInput styles สำหรับหน้าตรวจภาษี (บรรทัด 3011-3036)
- **หมายเหตุ**: 
  - สีที่ใช้: ลูกค้าคอนเฟิร์ม (เขียว), ไม่ต้องคอนเฟิร์มลูกค้า (ส้ม), รอลูกค้าคอนเฟิร์ม (เหลือง), ลูกค้าให้แก้รายได้ (แดง)
  - ข้อมูลจะถูกดึงจากฐานข้อมูลและแสดงสีตามค่าที่เลือกอัตโนมัติ

### ✅ BUG-118: จำกัดการเข้าถึงแถบ VAT
- ป้องกันการเข้าถึงแถบ "ยื่นแบบภาษีมูลค่าเพิ่ม (VAT)" เมื่อบริษัทไม่ได้จดภาษีมูลค่าเพิ่ม
- ตรวจสอบ `tax_registration_status` จาก `clients` table
- Disable tab และแสดง Alert เมื่อไม่สามารถเข้าถึงได้

### ✅ BUG-119: อัพเดท Notification เมื่อบันทึกข้อมูลซ้ำ
- อัพเดท notification เดิมแทนการสร้างใหม่เมื่อมี notification ที่ยังไม่อ่านอยู่แล้ว
- รีเซ็ต `expires_at` เป็น 24 ชั่วโมงจากปัจจุบันเมื่ออัพเดท

### ✅ BUG-120: แปลงสถานะ "EDIT" เป็นภาษาไทย
- แสดงเป็น "แก้ไข" (สีแดง) แทน "EDIT"

### ✅ BUG-121, BUG-122: แก้ไข `income_confirmed` จาก BOOLEAN เป็น VARCHAR
- เปลี่ยน `income_confirmed` จาก `BOOLEAN` เป็น `VARCHAR(100)`
- รองรับ enum values: `'customer_confirmed'`, `'no_confirmation_needed'`, `'waiting_customer'`, `'customer_request_change'`

### ✅ BUG-123: Error Message ไม่ชัดเจนเมื่อ Backend Server ไม่ได้รัน
- เพิ่มการตรวจสอบ network error
- แสดง error message ที่ชัดเจน: "ไม่สามารถเชื่อมต่อกับ Backend Server ได้ กรุณาตรวจสอบว่า Backend Server รันอยู่ที่ http://localhost:3001"

### ✅ BUG-124: pp30_sent_for_review_date ไม่ถูกอัพเดทเมื่อสถานะเป็น "รอตรวจ" หรือ "รอตรวจอีกครั้ง"
- เปลี่ยนลำดับการตรวจสอบ: ตรวจสอบสถานะก่อน `formValues.pp30_sent_date`
- อัพเดท timestamp ทุกครั้งที่เลือกสถานะ "รอตรวจ" หรือ "รอตรวจอีกครั้ง"

### ✅ BUG-125: Error Message ไม่ชัดเจนเมื่อบันทึกข้อมูลล้มเหลว
- เพิ่มการตรวจสอบ network error ใน `onError` callback
- แสดง error message ที่ชัดเจนเมื่อ Backend Server ไม่ได้รัน

### ✅ BUG-126: หน้าเว็บไม่อัพเดทข้อมูล pp30_sent_for_review_date หลังจากบันทึกสำเร็จ
- เพิ่ม `refetchTaxData()` หลังจากบันทึกสำเร็จ
- เพิ่ม `refetchOnMount` และ `refetchOnWindowFocus`
- อัพเดทข้อมูลทันทีหลังจากบันทึกสำเร็จ

### ✅ การปรับปรุงรูปแบบการแสดงผลวันที่
- **วันที่รับเอกสาร**: แสดงในรูปแบบ `DD/MM/YYYY` แทน `YYYY-MM-DD`
- **วันที่จดภาษีมูลค่าเพิ่ม**: แสดงในรูปแบบ `DD/MM/YYYY` แทน `YYYY-MM-DD`

**ดูรายละเอียดเพิ่มเติม**: `Documentation/Agent_cursor_ai/BUG_FIXES.md`

---

### ✅ Feature Update: แสดงทุกสถานะในฐานข้อมูล แต่ disable สถานะที่ไม่ให้เลือก (2026-02-02)
- **ปัญหา**: ฟอร์มไม่แสดงสถานะบางสถานะที่อาจมีในฐานข้อมูล ทำให้ผู้ใช้ไม่เห็นสถานะทั้งหมด
- **แก้ไข**: 
  - เพิ่มสถานะทั้งหมดที่อาจมีในฐานข้อมูลเข้าไปใน statusOptions สำหรับทั้ง 3 หน้า (ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี)
  - Disable สถานะที่ไม่ให้เลือกตาม role (แสดงแต่เลือกไม่ได้)
  - เพิ่มสถานะเก่า (backward compatibility) เพื่อรองรับข้อมูลเก่าในฐานข้อมูล
- **ผลลัพธ์**:
  - ✅ ผู้ใช้เห็นสถานะทั้งหมดที่อาจมีในฐานข้อมูล
  - ✅ สถานะที่ไม่ให้เลือกจะถูก disable แต่ยังแสดงใน dropdown
  - ✅ สถานะเก่าแสดงเป็น "(ผู้ตรวจภาษี)" แทน "(เก่า)" เพื่อให้ชัดเจนว่าเป็นสถานะที่ผู้ตรวจภาษีใช้

### ✅ Feature Update: แก้ไขคำว่า "(เก่า)" เป็น "(ผู้ตรวจภาษี)" (2026-02-02)
- **ปัญหา**: สถานะเก่าแสดงคำว่า "(เก่า)" ซึ่งไม่ชัดเจนว่าเป็นสถานะของผู้ตรวจภาษี
- **แก้ไข**: เปลี่ยน label ของสถานะเก่า (`receipt`, `inquiry`, `review`, `edit`) จาก "(เก่า)" เป็น "(ผู้ตรวจภาษี)" ในทั้ง 3 หน้า
- **ผลลัพธ์**:
  - ✅ สถานะเก่าจะแสดงเป็น "(ผู้ตรวจภาษี)" เพื่อให้ชัดเจนว่าเป็นสถานะที่ผู้ตรวจภาษีใช้
  - ✅ ค่าในฐานข้อมูลยังคงเป็น `value` (เช่น `'edit'`) ไม่ใช่ `label` (เช่น `'แก้ไข (ผู้ตรวจภาษี)'`)

### ✅ Feature Update: การนับ "ตรวจแล้ว" จากวันที่ส่งตรวจคืน (2026-02-02)
- **ปัญหา**: การนับ "ตรวจแล้ว" ไม่ตรงกับความต้องการ ต้องการให้นับจากวันที่ส่งตรวจคืน
- **แก้ไข**: 
  - **ตรวจแล้ว (WHT)**: เปลี่ยนจากการนับจากสถานะเป็นนับจาก `pnd_review_returned_date IS NOT NULL`
  - **ตรวจแล้ว (VAT)**: เปลี่ยนจากการนับจากสถานะเป็นนับจาก `pp30_review_returned_date IS NOT NULL`
  - เพิ่ม filter `tax_inspection_responsible` ใน summary endpoint เพื่อแสดงเฉพาะงานที่รับผิดชอบ
- **ผลลัพธ์**:
  - ✅ การนับ "ตรวจแล้ว" ตรงกับความต้องการ (นับจากวันที่ส่งตรวจคืน)
  - ✅ แสดงเฉพาะงานที่ผู้ตรวจภาษีรับผิดชอบ
  - ✅ ข้อมูล summary ถูกต้องและตรงกับฐานข้อมูล

### ✅ Feature Update: ปรับ Layout ให้เต็มหน้าจอและยกเลิกการรองรับ Mobile (2026-02-02)
- **วันที่แก้ไข**: 2026-02-02
- **ส่วน/หน้าที่เกี่ยวข้อง**: Tax Inspection Page (`src/pages/TaxInspection.tsx`, `src/components/TaxInspection/TaxInspectionTable.tsx`, `src/components/TaxInspection/SummaryCard.tsx`)
- **ระดับความรุนแรง**: Low (UI/UX Enhancement)
- **คำอธิบายปัญหา**: 
  - Layout ถูกจำกัดด้วย Container size="xl" ทำให้มี whitespace ด้านข้างมาก
  - Summary Card ใช้ responsive breakpoints ทำให้แสดงผลไม่สม่ำเสมอบนหน้าจอขนาดใหญ่
  - ไม่รองรับ mobile อยู่แล้ว จึงควรปรับให้เต็มหน้าจอเพื่อให้เห็นข้อมูลชัดเจนขึ้น
- **วิธีแก้ไข**: 
  1. **ปรับ Container**: เปลี่ยนจาก `<Container size="xl">` เป็น `<Container fluid px="xl" py="md">` เพื่อให้ layout เต็มหน้าจอ
  2. **ปรับ Summary Card**: เปลี่ยนจาก `cols={{ base: 2, sm: 3, lg: 6 }}` เป็น `cols={6}` เพื่อให้แสดงผลคงที่ 6 คอลัมน์
  3. **Sticky Columns**: Build และ ชื่อบริษัท จะตรึงเมื่อ scroll แนวนอน (z-index: 15 สำหรับ header, 10 สำหรับ body)
- **ไฟล์ที่แก้ไข**: 
  - `src/pages/TaxInspection.tsx`
  - `src/components/TaxInspection/SummaryCard.tsx`
- **หมายเหตุ**: 
  - Layout ตอนนี้เต็มหน้าจอแล้ว (full width)
  - ไม่มี whitespace ด้านข้าง
  - เหมาะสำหรับการใช้งานบน desktop เท่านั้น (ไม่รองรับ mobile)
  - ข้อมูลแสดงชัดเจนขึ้น

### ✅ Feature Update: เปลี่ยนคอลัมน์ "ผู้ทำ" เป็น "ข้อมูลผู้รับผิดชอบ" (2026-02-02)
- **วันที่แก้ไข**: 2026-02-02
- **ส่วน/หน้าที่เกี่ยวข้อง**: Tax Inspection Table (`src/components/TaxInspection/TaxInspectionTable.tsx`)
- **ระดับความรุนแรง**: Low (UI/UX Enhancement)
- **คำอธิบายปัญหา**: 
  - คอลัมน์ "ผู้ทำ" แสดงเฉพาะชื่อผู้ตรวจภาษีเท่านั้น
  - ไม่แสดงข้อมูลผู้รับผิดชอบคนอื่นๆ (พนักงานที่รับผิดชอบในการคีย์, พนักงานที่ยื่น WHT, พนักงานที่ยื่น VAT)
- **วิธีแก้ไข**: 
  1. **เพิ่ม Helper Functions**:
     - `formatEmployeeName`: จัดรูปแบบชื่อพนักงานเป็น "ชื่อ (ชื่อเล่น)"
     - `formatTextWithHighlight`: จัดรูปแบบข้อความพร้อม highlight labels ด้วยสีส้ม (#ff6b35)
  2. **แก้ไขการสร้างข้อมูล `performer`**:
     - แสดงข้อมูลผู้รับผิดชอบหลายคน:
       - ผู้ตรวจภาษี
       - พนักงานที่รับผิดชอบในการคีย์
       - พนักงานที่ยื่น WHT
       - พนักงานที่ยื่น VAT
     - แสดงเฉพาะรายการที่มีข้อมูล
     - แสดงเป็น bullet points เพื่อให้อ่านง่าย
  3. **เปลี่ยนชื่อคอลัมน์**: จาก "ผู้ทำ" เป็น "ข้อมูลผู้รับผิดชอบ"
  4. **ปรับการแสดงผล**: ใช้ `formatTextWithHighlight` เพื่อ highlight labels ด้วยสีส้ม (#ff6b35)
- **ไฟล์ที่แก้ไข**: 
  - `src/components/TaxInspection/TaxInspectionTable.tsx`
- **หมายเหตุ**: 
  - คอลัมน์ "ข้อมูลผู้รับผิดชอบ" แสดงข้อมูลผู้รับผิดชอบหลายคนแบบเดียวกับหน้า "สถานะยื่นภาษี"
  - Labels จะถูก highlight ด้วยสีส้ม (#ff6b35) เพื่อให้อ่านง่าย

### ✅ Feature Update: เพิ่มคำอธิบายสถานะสำหรับฟอร์มสถานะภาษีประจำเดือน (2026-02-04)
- **วันที่แก้ไข**: 2026-02-04
- **ส่วน/หน้าที่เกี่ยวข้อง**: Tax Inspection Form (`src/components/TaxInspection/TaxInspectionForm.tsx`)
- **ระดับความรุนแรง**: Low (UI/UX Enhancement)
- **คำอธิบายปัญหา**: 
  - ผู้ใช้ไม่เข้าใจความหมายของสถานะต่างๆ ในฟอร์มสถานะภาษีประจำเดือน
  - ไม่มีคำอธิบายสำหรับสถานะ "สถานะบันทึกบัญชี", "สถานะสเตทเม้นท์ธนาคาร", "กระทบภาษีประจำเดือน", "กระทบแบงค์", และ "คอนเฟิร์มรายได้"
- **วิธีแก้ไข**: 
  1. **เปลี่ยนจาก Tooltip เป็นปุ่มคลิก**:
     - เปลี่ยนจาก Tooltip (hover) เป็นปุ่มไอคอนข้อมูลที่คลิกได้
     - หัวข้อของแต่ละ field สามารถคลิกได้เพื่อเปิด/ปิดคำอธิบาย
  2. **เพิ่ม State สำหรับเก็บสถานะการเปิด/ปิด**:
     - เพิ่ม `expandedStatusInfo` state เพื่อเก็บสถานะการเปิด/ปิดของแต่ละ field
     - รองรับ 5 fields: `accounting_record_status`, `bank_statement_status`, `monthly_tax_reconciliation`, `bank_reconciliation`, `confirm_income`
  3. **เพิ่ม Helper Functions**:
     - `toggleStatusInfo`: สำหรับ toggle การแสดงผลของแต่ละ field
     - `StatusInfoButton`: Component สำหรับปุ่มไอคอนข้อมูล
  4. **เพิ่มคำอธิบายสำหรับแต่ละสถานะ**:
     - **สถานะบันทึกบัญชี**: อธิบายความหมายของแต่ละตัวเลือก (เหลือมากกว่า 1 เดือน, บันทึกครบแล้ว, ขาดเอกสารบางรายการ)
     - **สถานะสเตทเม้นท์ธนาคาร**: อธิบายความหมายของแต่ละตัวเลือก (รับครบแล้ว, อยู่ระหว่างการขอ, ลูกค้ายังไม่เปิดธนาคาร, ไม่ตอบสนอง)
     - **กระทบภาษีประจำเดือน**: อธิบายความหมายของแต่ละตัวเลือก (กระทบแล้ว, กระทบบางส่วน)
     - **กระทบแบงค์**: อธิบายความหมายของแต่ละตัวเลือก (แบงค์ตรงทุกรายการ, กระทบแล้วบางส่วน, ลูกค้ายังไม่เปิดธนาคาร, ลูกค้าไม่ส่งเอกสาร)
     - **คอนเฟิร์มรายได้**: อธิบายสถานะ "ลูกค้าให้แก้รายได้" ว่า "คือสถานะที่จะถูกอัพเดตเมื่อมีการส่งตรวจรายได้ไปแล้ว ลูกค้าพึ่งจะมาแจ้งว่ามีรายได้ที่ยังตกหล่น หรือเพิ่มรายได้"
  5. **แสดงคำอธิบายด้านล่างของ Select field**:
     - เมื่อคลิกที่หัวข้อหรือปุ่มไอคอนข้อมูล จะแสดง Card พร้อมคำอธิบายด้านล่างของ Select field
     - Card มีพื้นหลังสีส้มอ่อน (#fff3e0), กรอบสีส้ม (#ff6b35), และแสดงรายการคำอธิบายเป็น List
- **ไฟล์ที่แก้ไข**: 
  - `src/components/TaxInspection/TaxInspectionForm.tsx`
- **หมายเหตุ**: 
  - ผู้ใช้สามารถคลิกที่หัวข้อหรือปุ่มไอคอนข้อมูลเพื่อเปิด/ปิดคำอธิบายได้
  - คำอธิบายแสดงด้านล่างของ Select field เพื่อไม่ให้บังการใช้งาน
  - UI สวยงามและใช้งานง่ายขึ้น
  - แสดงผลแบบหลายบรรทัดพร้อม bullet points

## 📝 Recent Updates (2026-02-05)

### ✅ Feature Update: Acknowledgment Modal สำหรับทุกบริษัท
- **วันที่แก้ไข**: 2026-02-05
- **ส่วน/หน้าที่เกี่ยวข้อง**: Tax Inspection Page (`src/pages/TaxInspection.tsx`, `src/components/TaxInspection/AcknowledgmentModal.tsx`)
- **ระดับความรุนแรง**: Medium (Feature Enhancement)
- **คำอธิบายปัญหา**: 
  - ระบบเดิมจะแสดง acknowledgment modal เฉพาะเมื่อบริษัทมีข้อมูล acknowledgment เท่านั้น
  - ผู้ใช้ต้องการให้แสดง acknowledgment modal สำหรับทุกบริษัทเมื่อกดปุ่ม "เลือกบริษัทนี้"
- **วิธีแก้ไข**: 
  1. **แก้ไข handleSelectCompany**: ลบการตรวจสอบ `hasAcknowledgmentData(record)` ออก และแสดง modal เสมอ
  2. **แสดงข้อมูล acknowledgment**: ถ้ามีข้อมูล acknowledgment จะแสดงข้อมูล ถ้าไม่มีจะแสดง modal ว่าง (แต่ยังต้องพิมพ์ "Yes" เพื่อยืนยัน)
- **ไฟล์ที่แก้ไข**: 
  - `src/pages/TaxInspection.tsx` - แก้ไข `handleSelectCompany` function
- **หมายเหตุ**: 
  - ตอนนี้ทุกบริษัทจะแสดง acknowledgment modal เมื่อกดปุ่ม "เลือกบริษัทนี้"
  - ผู้ใช้ต้องพิมพ์ "Yes" เพื่อยืนยันก่อนเปิดฟอร์มเสมอ

**Last Updated**: 2026-02-05
