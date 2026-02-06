# เส้นทางบันทึกข้อมูล - ฟอร์มสถานะภาษีประจำเดือน

## ภาพรวม

เมื่อกดปุ่ม **"บันทึกข้อมูล"** ในฟอร์มสถานะภาษีประจำเดือน ข้อมูลจะไหลตามลำดับนี้:

```
[ฟอร์ม Frontend] → [API Service] → [HTTP Request] → [Backend Route] → [Database]
```

---

## 1. Frontend (ที่ส่งข้อมูล)

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `src/components/TaxInspection/TaxInspectionForm.tsx` |
| **ฟังก์ชัน** | `handleSave()` (บรรทัด ~827) |
| **การส่ง** | `updateMutation.mutate(updateData)` (บรรทัด ~1310) |
| **Mutation** | `useMutation` เรียก `monthlyTaxDataService.update(taxData.id, data)` (บรรทัด ~688) |

**ข้อมูลที่ส่ง (updateData)** ประกอบด้วย เช่น:
- `pnd_status`, `pp30_status` (สถานะ ภงด. / ภ.พ.30)
- `pp30_filing_response`, `pp30_sent_to_customer_date`, ฯลฯ
- สถานะแบบฟอร์ม (pnd_1_40_1_status, pnd_3_status, ...)
- จำนวนใบแนบ, วันที่ต่างๆ, ผู้รับผิดชอบ ฯลฯ

---

## 2. API Service (ที่เรียก Backend)

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `src/services/monthlyTaxDataService.ts` |
| **เมธอด** | `update(id: string, data: Partial<MonthlyTaxData>)` (บรรทัด ~236) |
| **HTTP** | `api.put(\`/monthly-tax-data/${id}\`, data)` |
| **Base URL** | `VITE_API_BASE_URL` หรือ `http://localhost:3001/api` |

**URL ที่เรียกจริง**
- ตัวอย่าง: `PUT http://localhost:3001/api/monthly-tax-data/20cc584b-2ea2-45a4-a249-86a74a080853`
- `:id` = รหัส record ภาษีรายเดือน (UUID จาก `taxData.id`)

---

## 3. Backend (ที่รับและบันทึก)

| รายการ | รายละเอียด |
|--------|-------------|
| **Server** | `backend/server.js` |
| **Mount route** | `app.use('/api/monthly-tax-data', monthlyTaxDataRoutes)` (บรรทัด ~96) |
| **ไฟล์ route** | `backend/routes/monthly-tax-data.js` |
| **Endpoint** | `PUT /:id` (บรรทัด ~1514) |
| **Full path** | `PUT /api/monthly-tax-data/:id` |

**ลำดับใน Backend**
1. รับ `id` จาก `req.params`
2. รับ body จาก `req.body` (accounting_responsible, pnd_status, pp30_status, pp30_filing_response, วันที่ต่างๆ ฯลฯ)
3. แปลง/คำนวณค่า (เช่น แปลง `pp30_status` เป็น timestamp ที่ set ใน DB)
4. ตรวจสิทธิ์ (Admin หรือผู้รับผิดชอบรายการนั้น)
5. รัน `UPDATE monthly_tax_data SET ... WHERE id = ?`

---

## 4. ฐานข้อมูล (ที่เก็บข้อมูลจริง)

| รายการ | รายละเอียด |
|--------|-------------|
| **ตาราง** | `monthly_tax_data` |
| **Database** | ตาม config ใน `backend/config/database.js` (โดยทั่วไปเป็น MySQL) |
| **การอัปเดต** | `UPDATE monthly_tax_data SET ... WHERE id = ?` (บรรทัด ~1746 ใน monthly-tax-data.js) |

**คอลัมน์หลักที่ถูกอัปเดต (ตัวอย่าง)**
- บุคคล: `accounting_responsible`, `tax_inspection_responsible`, `document_entry_responsible`, `wht_filer_employee_id`, `wht_filer_current_employee_id`, `vat_filer_employee_id`, `vat_filer_current_employee_id`
- ภงด.: `pnd_status`, `pnd_sent_for_review_date`, `pnd_review_returned_date`, `pnd_sent_to_customer_date`, สถานะแบบฟอร์มและจำนวนใบแนบ
- ภ.พ.30: `pp30_sent_for_review_date`, `pp30_review_returned_date`, `pp30_sent_to_customer_date`, `pp30_filing_response`, `vat_draft_completed_date`, `pp30_form`, `pp30_payment_status`, `pp30_payment_amount`, สถานะแบบฟอร์ม ฯลฯ
- อื่นๆ: `document_received_date`, `bank_statement_status`, `accounting_record_status`, `monthly_tax_impact`, `bank_impact`, `updated_at`

**หมายเหตุ:** ไม่มีคอลัมน์ `pp30_status` ในตาราง — ใช้ `pp30_filing_response` และวันที่ต่างๆ เพื่อให้ frontend/backend derive สถานะ "ชำระแล้ว" / "ส่งลูกค้าแล้ว" ฯลฯ

---

## สรุปสั้น ๆ

| ขั้นตอน | ที่อยู่ | สรุป |
|---------|---------|------|
| 1. กดบันทึก | `TaxInspectionForm.tsx` → `handleSave` → `updateMutation.mutate(updateData)` | สร้าง payload และเรียก service |
| 2. เรียก API | `monthlyTaxDataService.ts` → `api.put('/monthly-tax-data/' + id, data)` | ส่ง `PUT` ไปที่ Backend |
| 3. รับและอัปเดต | `backend/routes/monthly-tax-data.js` → `router.put('/:id', ...)` | ตรวจสิทธิ์ แปลงค่า แล้ว UPDATE |
| 4. เก็บข้อมูล | MySQL ตาราง `monthly_tax_data` | ข้อมูลถูกบันทึกในแถวที่ `id` ตรงกับ `:id` ใน URL |

**URL ที่ใช้บันทึก (ตัวอย่าง):**  
`PUT http://localhost:3001/api/monthly-tax-data/{id ของ record}`

**ตารางใน DB:** `monthly_tax_data`
