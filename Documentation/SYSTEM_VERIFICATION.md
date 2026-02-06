# 🔍 การตรวจสอบระบบบันทึกข้อมูล - Monthly Tax Data

## 📋 สรุปการตรวจสอบ

**วันที่ตรวจสอบ:** 2026-02-03  
**ตารางที่ควรบันทึก:** `monthly_tax_data`  
**หน้าที่เกี่ยวข้อง:** ตรวจภาษี, สถานะยื่นภาษี, ยื่นภาษี

---

## ✅ ผลการตรวจสอบ

### 1. **Frontend → API Service**
- ✅ **ไฟล์:** `src/components/TaxInspection/TaxInspectionForm.tsx`
- ✅ **ฟังก์ชัน:** `handleSave()` → `updateMutation.mutate(updateData)`
- ✅ **Service:** `monthlyTaxDataService.update(taxData.id, data)`
- ✅ **HTTP Method:** `PUT`
- ✅ **URL:** `PUT /api/monthly-tax-data/{id}`

### 2. **Backend Route**
- ✅ **ไฟล์:** `backend/routes/monthly-tax-data.js`
- ✅ **Endpoint:** `PUT /:id` (บรรทัด ~1514)
- ✅ **Mount:** `app.use('/api/monthly-tax-data', monthlyTaxDataRoutes)` ใน `backend/server.js` (บรรทัด ~96)
- ✅ **Full Path:** `PUT /api/monthly-tax-data/:id`

### 3. **Database UPDATE**
- ✅ **ตาราง:** `monthly_tax_data` (ถูกต้อง)
- ✅ **Query:** `UPDATE monthly_tax_data SET ... WHERE id = ?` (บรรทัด ~1747)
- ✅ **Execution:** `await pool.execute(updateQuery, [...])` (บรรทัด ~1803)

---

## 🔍 Debug Logs ที่เพิ่มแล้ว

### Backend Console Logs

เมื่อมีการบันทึกข้อมูล จะเห็น log ใน Backend Terminal:

1. **ก่อน UPDATE:**
   ```
   💾 [Backend] Executing UPDATE query: {
     table: 'monthly_tax_data',
     id: '...',
     build: '018',
     pp30_status: 'paid',
     pp30_filing_response: 'paid',
     pnd_status: null,
     queryLength: ...,
     paramsCount: ...
   }
   ```

2. **หลัง UPDATE สำเร็จ:**
   ```
   ✅ [Backend] UPDATE executed successfully: {
     table: 'monthly_tax_data',
     id: '...',
     affectedRows: 1,
     changedRows: 1,
     build: '018',
     pp30_status: 'paid',
     pp30_filing_response: 'paid',
     pnd_status: null
   }
   ```

3. **ถ้ามี Error:**
   ```
   Update monthly tax data error: ...
   ```

---

## 🚨 วิธีตรวจสอบว่า UPDATE ทำงานจริงหรือไม่

### วิธีที่ 1: ดู Backend Terminal
1. เปิด Backend Terminal (`npm run dev` ใน `backend/`)
2. กดบันทึกข้อมูลในฟอร์ม
3. ดู log:
   - ถ้าเห็น `💾 [Backend] Executing UPDATE query` → ระบบได้รับ request แล้ว
   - ถ้าเห็น `✅ [Backend] UPDATE executed successfully` → UPDATE ทำงานสำเร็จ
   - ถ้าเห็น `affectedRows: 1, changedRows: 1` → มีแถวถูกอัปเดต 1 แถว
   - ถ้าเห็น `affectedRows: 0` → ไม่มีแถวถูกอัปเดต (อาจเป็นเพราะ `id` ไม่ตรง หรือไม่มีแถวนั้น)

### วิธีที่ 2: ตรวจสอบ Database โดยตรง
1. เปิด MySQL Client (phpMyAdmin, MySQL Workbench, หรือ command line)
2. เช็คตาราง `monthly_tax_data`:
   ```sql
   SELECT id, build, pp30_status, pp30_filing_response, pnd_status, updated_at 
   FROM monthly_tax_data 
   WHERE build = '018' 
   ORDER BY updated_at DESC 
   LIMIT 1;
   ```
3. ดูว่า `updated_at` เปลี่ยนเป็นเวลาล่าสุดหรือไม่
4. ดูว่า `pp30_filing_response`, `pnd_status` ฯลฯ ถูกอัปเดตหรือไม่

### วิธีที่ 3: ดู Network Tab ใน Browser
1. เปิด DevTools → Network tab
2. กดบันทึกข้อมูล
3. หา request `PUT /api/monthly-tax-data/{id}`
4. ดู:
   - **Request Payload:** ข้อมูลที่ส่งไป
   - **Response:** ข้อมูลที่ backend ส่งกลับ (ควรมี `success: true`)
   - **Status Code:** ควรเป็น `200 OK`

---

## ⚠️ สาเหตุที่เป็นไปได้ถ้า UPDATE ไม่ทำงาน

### 1. **ID ไม่ตรง**
- Frontend ส่ง `id` ที่ไม่มีในตาราง → `affectedRows: 0`
- **แก้:** เช็คว่า `taxData.id` ในฟอร์มตรงกับ `id` ในตาราง

### 2. **Permission Error**
- User ไม่มีสิทธิ์ (ไม่ใช่ Admin หรือไม่ใช่ responsible person) → Backend return `403 Forbidden`
- **แก้:** เช็ค log ใน Backend ว่า return status code อะไร

### 3. **Database Connection Error**
- Backend ไม่สามารถเชื่อมต่อ MySQL → `affectedRows: undefined` หรือ error
- **แก้:** เช็ค `backend/.env` และ database config

### 4. **SQL Error**
- Query syntax ผิด หรือคอลัมน์ไม่มี → Backend log จะแสดง error
- **แก้:** ดู error message ใน Backend terminal

### 5. **Transaction Rollback**
- ถ้ามี transaction และเกิด error → อาจ rollback
- **แก้:** เช็คว่าไม่มี transaction ที่ rollback

---

## 📝 สรุป

**ระบบถูกตั้งค่าให้บันทึกไปที่ตาราง `monthly_tax_data` ถูกต้องแล้ว**

- ✅ Frontend ส่ง `PUT /api/monthly-tax-data/:id`
- ✅ Backend route รับและรัน `UPDATE monthly_tax_data SET ... WHERE id = ?`
- ✅ ตารางที่บันทึก: `monthly_tax_data` (ถูกต้อง)

**ถ้ายังไม่เห็นข้อมูลเปลี่ยนใน DB:**
1. เช็ค Backend Terminal ว่า UPDATE ทำงานหรือไม่ (ดู log `💾` และ `✅`)
2. เช็คว่า `affectedRows` เป็น 1 หรือไม่ (ถ้าเป็น 0 = ไม่มีแถวถูกอัปเดต)
3. เช็คว่า `id` ที่ส่งไปตรงกับ `id` ในตารางหรือไม่
4. เช็คว่าไม่มี error ใน Backend terminal
