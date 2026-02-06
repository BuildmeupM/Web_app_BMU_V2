# 🔄 Logic การทำงานของปุ่ม "รีเฟรชข้อมูล"

## 📋 สรุป

ปุ่ม "รีเฟรชข้อมูล" ใช้สำหรับดึงข้อมูลล่าสุดจาก server โดยไม่ต้อง refresh หน้าเว็บ

---

## 🎯 การทำงาน

### 1. หน้าสถานะยื่นภาษี (Tax Status)

**ไฟล์:** `src/pages/TaxStatus.tsx`

**การทำงาน:**
```typescript
const handleRefresh = useCallback(async () => {
  setIsRefreshing(true)
  try {
    // Refetch list queries
    await queryClient.refetchQueries({ 
      queryKey: ['monthly-tax-data', 'tax-status'], 
      exact: false 
    })
    // Refetch summary queries
    await queryClient.refetchQueries({ 
      queryKey: ['monthly-tax-data-summary', 'tax-status'], 
      exact: false 
    })
  } catch (error) {
    console.error('Refresh error:', error)
  } finally {
    setIsRefreshing(false)
  }
}, [queryClient])
```

**สิ่งที่ทำ:**
1. ตั้ง `isRefreshing = true` → แสดง loading state
2. Refetch list queries (`monthly-tax-data`, `tax-status`)
3. Refetch summary queries (`monthly-tax-data-summary`, `tax-status`)
4. ตั้ง `isRefreshing = false` → ซ่อน loading state

---

### 2. หน้ายื่นภาษี (Tax Filing)

**ไฟล์:** `src/pages/TaxFiling.tsx`

**การทำงาน:**
```typescript
const handleRefresh = useCallback(async () => {
  setIsRefreshing(true)
  try {
    // Refetch list queries (ทำแบบ staggered เพื่อลด burst requests)
    await queryClient.refetchQueries({ 
      queryKey: ['monthly-tax-data', 'tax-filing'], 
      exact: false 
    })
    // Refetch summary queries (ทำหลังจาก list เสร็จแล้ว)
    await queryClient.refetchQueries({ 
      queryKey: ['monthly-tax-data-summary', 'tax-filing'], 
      exact: false 
    })
  } catch (error) {
    console.error('Refresh error:', error)
  } finally {
    setIsRefreshing(false)
  }
}, [queryClient])
```

**สิ่งที่ทำ:**
1. ตั้ง `isRefreshing = true` → แสดง loading state
2. Refetch list queries (`monthly-tax-data`, `tax-filing`) **ก่อน**
3. Refetch summary queries (`monthly-tax-data-summary`, `tax-filing`) **หลัง** (staggered)
4. ตั้ง `isRefreshing = false` → ซ่อน loading state

**ทำไมต้อง staggered?**
- เพื่อลด burst requests และโอกาสโดน 429 (Too Many Requests)
- ทำ list ก่อน แล้วค่อย summary เพื่อลด concurrent requests

---

## 🔄 Flow การทำงาน

```
1. ผู้ใช้กดปุ่ม "รีเฟรชข้อมูล"
   ↓
2. Frontend: setIsRefreshing(true) → แสดง loading
   ↓
3. Frontend: queryClient.refetchQueries() → ส่ง request ไปยัง backend
   ↓
4. Backend: Query database และส่ง response กลับ
   ↓
5. Frontend: อัพเดท React Query cache ด้วยข้อมูลใหม่
   ↓
6. Frontend: Component re-render → แสดงข้อมูลใหม่
   ↓
7. Frontend: setIsRefreshing(false) → ซ่อน loading
```

---

## 📊 ตารางสรุป

| หน้า | Query Keys ที่ Refetch | Staggered? |
|------|------------------------|------------|
| สถานะยื่นภาษี | `['monthly-tax-data', 'tax-status']`<br>`['monthly-tax-data-summary', 'tax-status']` | ❌ (ทำพร้อมกัน) |
| ยื่นภาษี | `['monthly-tax-data', 'tax-filing']`<br>`['monthly-tax-data-summary', 'tax-filing']` | ✅ (ทำแบบ staggered) |

---

## ⚠️ หมายเหตุสำคัญ

1. **ใช้ `refetchQueries` แทน `invalidateQueries`**: 
   - `refetchQueries` → refetch ทันที
   - `invalidateQueries` → mark as stale แต่ไม่ refetch จนกว่าจะมี component ที่ใช้ query นั้น

2. **Staggered Refresh**: 
   - หน้ายื่นภาษีใช้ staggered เพื่อลด burst requests
   - หน้าสถานะยื่นภาษีไม่ใช้ staggered (อาจจะเพิ่มในอนาคต)

3. **Error Handling**: 
   - ใช้ try-catch เพื่อจับ errors
   - แสดง error ใน console เท่านั้น (ไม่แสดง notification)

4. **Loading State**: 
   - ใช้ `isRefreshing` state เพื่อแสดง loading indicator
   - ปุ่มจะแสดง spinner เมื่อกำลัง refresh

---

## 🔍 วิธีตรวจสอบ

### 1. เช็คใน Browser Console
```javascript
// เมื่อกดปุ่ม refresh จะเห็น:
queryClient.refetchQueries({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false })
```

### 2. เช็คใน Network Tab
- จะเห็น requests ไปยัง `/api/monthly-tax-data?page=1&limit=20&...`
- จะเห็น requests ไปยัง `/api/monthly-tax-data/summary?...`

### 3. เช็คใน React DevTools
- Query cache จะถูกอัพเดทด้วยข้อมูลใหม่
- Component จะ re-render เมื่อ cache อัพเดท

---

## 📚 ไฟล์ที่เกี่ยวข้อง

- `src/pages/TaxStatus.tsx` - หน้าสถานะยื่นภาษี
- `src/pages/TaxFiling.tsx` - หน้ายื่นภาษี
- `src/components/TaxStatus/FilterSection.tsx` - Filter section ของหน้าสถานะยื่นภาษี
- `src/components/TaxFiling/FilterSection.tsx` - Filter section ของหน้ายื่นภาษี
