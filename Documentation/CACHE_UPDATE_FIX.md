# 🔧 แก้ไขปัญหา Cache ไม่ถูกอัพเดท - Cache Update Fix

## 📋 สรุปปัญหา

**ปัญหา:** หลังบันทึกข้อมูล ตารางในหน้าสถานะยื่นภาษีไม่ถูกอัพเดททันที

**สาเหตุ:**
- Query key ใน TaxStatusTable มี parameters เยอะ: `['monthly-tax-data', 'tax-status', page, limit, employeeId, year, month, filters...]`
- การใช้ `setQueriesData` อาจจะไม่ match query keys ที่มี parameters เยอะ
- Cache อาจจะไม่ถูกอัพเดทเพราะ query key ไม่ match

---

## ✅ วิธีแก้ไข

### 1. เปลี่ยนจาก `setQueriesData` เป็น `setQueryData` แบบ loop

**เดิม:**
```typescript
queryClient.setQueriesData(filters, (oldData: any) => {
  // อัพเดท cache
  return { ...oldData, data: ... }
})
```

**ใหม่:**
```typescript
// หา query keys ทั้งหมดที่ match
const matched = queryClient.getQueriesData(filters)

// อัพเดท cache สำหรับทุก query key ที่ match
matched.forEach(([queryKey, cachedData]) => {
  if (itemInList) {
    queryClient.setQueryData(queryKey, {
      ...cachedData,
      data: cachedData.data.map(item => 
        item.id === updatedData.id ? updatedItemWithStatus : item
      )
    })
  }
})
```

**เหตุผล:**
- `setQueriesData` อาจจะไม่ match query keys ที่มี parameters เยอะ
- `setQueryData` (singular) อัพเดท cache สำหรับ query key ที่ระบุได้แน่นอน
- Loop ผ่านทุก query key ที่ match เพื่ออัพเดททั้งหมด

### 2. เพิ่ม `type: 'active'` ใน `refetchQueries`

**เดิม:**
```typescript
queryClient.refetchQueries({ queryKey: listKey, exact: false })
```

**ใหม่:**
```typescript
queryClient.refetchQueries({ 
  queryKey: listKey, 
  exact: false, 
  type: 'active'  // ✅ Refetch เฉพาะ queries ที่ active (component ที่ mount อยู่)
})
```

**เหตุผล:**
- `type: 'active'` จะ refetch เฉพาะ queries ที่ component กำลังใช้อยู่
- ลดการ refetch queries ที่ไม่จำเป็น

---

## 🔄 Flow การทำงานหลังแก้ไข

```
ผู้ใช้กดบันทึก
    ↓
Backend: บันทึกข้อมูลลงฐานข้อมูล
    ↓
Frontend: รับ response จาก backend
    ↓
[ทันที - 0 วินาที]
→ หา query keys ทั้งหมดที่ match ['monthly-tax-data', 'tax-status']
→ อัพเดท cache สำหรับทุก query key ที่ match (ใช้ setQueryData)
→ ตารางแสดงสถานะใหม่ทันที ✅
    ↓
[ทันที - 0.5-2 วินาที]
→ Invalidate cache → บังคับให้ refetch
→ Refetch queries ที่ active → ดึงข้อมูลล่าสุดจาก server
→ ตารางอัพเดทด้วยข้อมูลจาก server ✅
```

---

## 📊 ตารางเปรียบเทียบ

| ขั้นตอน | ก่อนแก้ไข | หลังแก้ไข |
|---------|-----------|-----------|
| **หา Query Keys** | `setQueriesData` (อาจไม่ match) | `getQueriesData` + loop (match แน่นอน) |
| **อัพเดท Cache** | `setQueriesData` (อาจไม่ทำงาน) | `setQueryData` แบบ loop (ทำงานแน่นอน) |
| **Refetch** | `refetchQueries` (refetch ทั้งหมด) | `refetchQueries` + `type: 'active'` (refetch เฉพาะ active) |

---

## ✅ ผลลัพธ์

### ✅ อัพเดท Cache ทันที (0 วินาที)
- หา query keys ทั้งหมดที่ match
- อัพเดท cache สำหรับทุก query key ที่ match
- ตารางแสดงสถานะใหม่ทันที

### ✅ Refetch ทันที (0.5-2 วินาที)
- Invalidate cache → บังคับให้ refetch
- Refetch queries ที่ active → ดึงข้อมูลล่าสุดจาก server
- ตารางอัพเดทด้วยข้อมูลจาก server

---

## 🔍 วิธีตรวจสอบ

### 1. เช็คใน Browser Console
```javascript
// เมื่อบันทึกสำเร็จ จะเห็น:
[TaxInspectionForm] List cache match ['monthly-tax-data', 'tax-status'] count: 1
[TaxInspectionForm] Updating cache for query key { queryKey: [...], itemInList: true, listLength: 3 }
[TaxInspectionForm] Updating cache with status { queryKey: [...], pp30_status: 'paid', ... }
```

### 2. เช็คใน React DevTools
- Query cache จะถูกอัพเดททันที
- Component จะ re-render เมื่อ cache อัพเดท

### 3. เช็คใน Network Tab
- จะเห็น request ไปยัง `/api/monthly-tax-data?page=1&limit=20&...` ทันทีหลังบันทึก

---

## 📚 ไฟล์ที่แก้ไข

- `src/components/TaxInspection/TaxInspectionForm.tsx` - เปลี่ยนจาก `setQueriesData` เป็น `setQueryData` แบบ loop

---

## ⚠️ หมายเหตุสำคัญ

1. **Query Key Matching:**
   - TaxStatusTable ใช้ query key ที่มี parameters เยอะ: `['monthly-tax-data', 'tax-status', page, limit, employeeId, year, month, filters...]`
   - ต้องใช้ `getQueriesData` เพื่อหา query keys ทั้งหมดที่ match
   - แล้วใช้ `setQueryData` อัพเดท cache สำหรับทุก query key ที่ match

2. **Refetch Type:**
   - ใช้ `type: 'active'` เพื่อ refetch เฉพาะ queries ที่ component กำลังใช้อยู่
   - ลดการ refetch queries ที่ไม่จำเป็น

3. **Cache Update:**
   - อัพเดท cache ทันทีด้วยข้อมูลจาก backend response
   - Refetch ทันทีเพื่อให้แน่ใจว่าข้อมูลตรงกับฐานข้อมูล
