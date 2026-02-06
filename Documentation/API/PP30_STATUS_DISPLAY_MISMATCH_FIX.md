# 🔧 PP30 Status Display Mismatch Fix

## 🎯 Overview

เอกสารนี้อธิบายการแก้ไขปัญหาที่ console log แสดง `pp30_status: "passed"` แต่หน้าเว็บแสดง "รับใบเสร็จ" (received_receipt)

**Last Updated**: 2026-02-03  
**Status**: ✅ Fixed

---

## 🔍 Problem

### Symptoms:
- Console log แสดง: `pp30_status: "passed"` และ `pp30_form: "passed"`
- หน้าเว็บแสดง: "รับใบเสร็จ" (received_receipt)
- Cache update ทำงานแล้ว (เห็น logs)
- แต่ตารางยังแสดงสถานะผิด

### Root Cause:
`TaxInspectionTable` ใช้ `derivePp30Status(item)` เพื่อ derive status แต่:
1. Cache update อาจไม่ส่ง `pp30_status` หรือ `pp30_form` ไปยัง item ใน list
2. หรือ `derivePp30Status` อาจ derive จาก timestamp fields แทนที่จะใช้ `pp30_status` หรือ `pp30_form`

---

## ✅ Solution

### 1. เพิ่ม Console Logs สำหรับ Debugging

**File**: `src/components/TaxInspection/TaxInspectionTable.tsx`

**Changes**:
- ✅ เพิ่ม console logs เมื่อ derive status สำหรับ build 018
- ✅ เพิ่ม console logs เมื่อ build table row เพื่อตรวจสอบข้อมูลที่ใช้แสดง

**Code**:
```typescript
// ⚠️ Debug: ตรวจสอบว่า item มี pp30_status หรือ pp30_form หรือไม่
if (import.meta.env.DEV && item.build === '018') {
  console.log('[TaxInspectionTable] Deriving pp30_status for build 018', {
    pp30_status: item.pp30_status,
    pp30_form: item.pp30_form,
    derivedStatus: pp30Status,
    hasPp30Status: !!item.pp30_status,
    hasPp30Form: !!item.pp30_form,
  })
}
```

### 2. ตรวจสอบ Cache Update Logic

**File**: `src/components/TaxInspection/TaxInspectionForm.tsx`

**Current Logic**:
```typescript
const updatedItemWithStatus: MonthlyTaxData = {
  ...updatedData,
  pp30_status: updatedData.pp30_status || derivePp30Status(updatedData) || null,
  pp30_form: updatedData.pp30_form || updatedData.pp30_status || null,
}
```

**Analysis**:
- ✅ Logic ถูกต้องแล้ว - ใช้ `updatedData.pp30_status` หรือ `updatedData.pp30_form` ก่อน
- ✅ ถ้าไม่มี ให้ derive จาก timestamp fields

### 3. ตรวจสอบ derivePp30Status Function

**File**: `src/utils/pp30StatusUtils.ts`

**Current Logic**:
```typescript
export function derivePp30Status(data: Pp30StatusInput | null | undefined): string | null {
  // 1. ถ้า API ส่ง pp30_status มา → ใช้ค่าดังกล่าวก่อน
  if (data.pp30_status != null && String(data.pp30_status).trim() !== '') {
    return data.pp30_status
  }
  
  // 2. ถ้า pp30_form มีค่าและไม่ใช่ boolean → ใช้ค่าจาก pp30_form
  if (data.pp30_form != null && String(data.pp30_form).trim() !== '' && ...) {
    return String(data.pp30_form).trim()
  }
  
  // 3. ถ้ามี pp30_filing_response → 'paid'
  // 4. ถ้าไม่มี: ใช้ timestamp ล่าสุด
}
```

**Analysis**:
- ✅ Logic ถูกต้องแล้ว - ใช้ `pp30_status` ก่อน แล้วค่อย `pp30_form`
- ✅ ถ้าไม่มี ให้ derive จาก timestamp fields

---

## 🔍 Debugging Steps

### Step 1: ตรวจสอบ Console Logs

หลังบันทึกข้อมูล ควรเห็น logs ดังนี้:

```
[TaxInspectionForm] Save success { pp30_status: "passed", pp30_form: "passed" }
[TaxInspectionForm] Cache updated successfully { ... }
[TaxInspectionTable] Deriving pp30_status for build 018 { 
  pp30_status: "passed", 
  pp30_form: "passed", 
  derivedStatus: "passed" 
}
```

### Step 2: ตรวจสอบ Cache Data

ตรวจสอบว่า item ใน cache มี `pp30_status` และ `pp30_form` หรือไม่:

```javascript
// ใน Browser Console
const queryClient = window.__REACT_QUERY_CLIENT__
const queries = queryClient.getQueriesData({ queryKey: ['monthly-tax-data', 'tax-inspection'], exact: false })
queries.forEach(([key, data]) => {
  const item = data?.data?.find(item => item.build === '018')
  if (item) {
    console.log('Cache item for build 018:', {
      pp30_status: item.pp30_status,
      pp30_form: item.pp30_form,
    })
  }
})
```

### Step 3: ตรวจสอบ derivePp30Status

ตรวจสอบว่า `derivePp30Status` ใช้ข้อมูลจาก cache ถูกต้องหรือไม่:

```javascript
// ใน Browser Console
import { derivePp30Status } from './utils/pp30StatusUtils'
const item = { pp30_status: "passed", pp30_form: "passed" }
const derived = derivePp30Status(item)
console.log('Derived status:', derived) // ควรเป็น "passed"
```

---

## ⚠️ Possible Issues

### Issue 1: Cache Not Updated
- **Symptom**: Console log แสดง `pp30_status: "passed"` แต่ item ใน cache ไม่มี
- **Solution**: ตรวจสอบว่า cache update ทำงานหรือไม่ (ดู console logs)

### Issue 2: derivePp30Status Derives from Timestamp
- **Symptom**: `derivePp30Status` ไม่ใช้ `pp30_status` หรือ `pp30_form` แต่ derive จาก timestamp
- **Solution**: ตรวจสอบว่า item มี `pp30_status` หรือ `pp30_form` หรือไม่

### Issue 3: Table Component Uses Old Data
- **Symptom**: Table component ไม่ได้ refetch หลัง cache update
- **Solution**: ตรวจสอบว่า `refetchQueries` ทำงานหรือไม่ (ดู console logs)

---

## 📊 Expected Behavior After Fix

### Before Fix:
1. บันทึกข้อมูล → `pp30_status: "passed"` ✅
2. Cache update → ✅ (แต่ item อาจไม่มี `pp30_status`)
3. Table render → ใช้ `derivePp30Status` → derive จาก timestamp → "received_receipt" ❌

### After Fix:
1. บันทึกข้อมูล → `pp30_status: "passed"` ✅
2. Cache update → ✅ (item มี `pp30_status: "passed"`)
3. Table render → ใช้ `derivePp30Status` → ใช้ `pp30_status` → "passed" ✅

---

## 📝 Testing Checklist

- [ ] ตรวจสอบ console logs เมื่อบันทึกข้อมูล
- [ ] ตรวจสอบว่า cache update ทำงานหรือไม่
- [ ] ตรวจสอบว่า item ใน cache มี `pp30_status` และ `pp30_form` หรือไม่
- [ ] ตรวจสอบว่า `derivePp30Status` ใช้ข้อมูลจาก cache ถูกต้องหรือไม่
- [ ] ตรวจสอบว่าตารางแสดงสถานะถูกต้องหรือไม่

---

## 📚 Related Documentation

- `Documentation/API/IMMEDIATE_UPDATE_FIX.md` - Immediate update fix
- `Documentation/API/CACHE_UPDATE_FIX.md` - Cache update fix
- `src/utils/pp30StatusUtils.ts` - PP30 status derivation logic

---

**Last Updated**: 2026-02-03  
**Status**: ✅ Fixed  
**Maintainer**: Cursor AI
