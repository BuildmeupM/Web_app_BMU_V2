-- Migration 035: Update Accounting Marketplace Purchase Logic
-- Description: อัปเดต logic การซื้อขายงานให้บันทึกข้อมูล purchased_by_accounting_responsible
-- Created: 2026-02-04
-- Purpose: เมื่อมีการซื้อขายงาน ต้องบันทึก purchased_by_accounting_responsible ใน monthly_tax_data และ work_assignments

-- Note: Migration นี้เป็น documentation สำหรับการอัปเดต backend logic
-- ไม่มีการเปลี่ยนแปลง schema แต่ต้องอัปเดต backend code ใน:
-- backend/routes/accounting-marketplace.js -> POST /:id/purchase

-- Logic ที่ต้องอัปเดต:
-- เมื่อมีการซื้องาน (purchase):
--   1. อัปเดต accounting_responsible = buyer_employee_id (เหมือนเดิม)
--   2. เพิ่ม: อัปเดต purchased_by_accounting_responsible = buyer_employee_id
--   3. ถ้ายังไม่มี original_accounting_responsible → ตั้งค่า original_accounting_responsible = seller_employee_id (ผู้ขายเดิม)
--   4. ถ้ายังไม่มี current_accounting_responsible → ตั้งค่า current_accounting_responsible = buyer_employee_id
--   5. ทำเหมือนกันสำหรับ wht_filer, vat_filer, document_entry_responsible (ถ้ามีข้อมูล)

-- สำหรับ work_assignments:
--   - ทำเหมือนกันกับ monthly_tax_data
