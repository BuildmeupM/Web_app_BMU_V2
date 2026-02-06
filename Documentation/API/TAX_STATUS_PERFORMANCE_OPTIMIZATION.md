# 🚀 Tax Status Page - Performance Optimization Recommendations

## 📋 Overview

เอกสารนี้อธิบายการปรับปรุงประสิทธิภาพสำหรับหน้าสถานะยื่นภาษี (Tax Status Page) โดยไม่กระทบกับฟีเจอร์และการทำงาน

**Last Updated**: 2026-02-02

---

## 🔍 Current Issues

### 1. Frontend (React Query) - การ Cache ไม่มีประสิทธิภาพ

#### ❌ TaxInspectionForm.tsx
```typescript
// ปัญหา: ไม่มีการ cache เลย
const { data: taxData } = useQuery(
  ['monthly-tax-data', buildId, currentYear, currentMonth],
  () => monthlyTaxDataService.getByBuildYearMonth(...),
  {
    enabled: !!buildId && opened,
    staleTime: 0, // ❌ ไม่มีการ cache
    refetchOnWindowFocus: true, // ❌ Refetch ทุกครั้งที่ focus window
    refetchOnMount: true, // ❌ Refetch ทุกครั้งที่ mount
  }
)

// ปัญหา: Fetch employees list ทุกครั้งแม้ว่าจะไม่ได้ใช้
const { data: employeesData } = useQuery(
  ['employees-list'],
  () => employeeService.getAll({ limit: 1000, status: 'active' }),
  {
    enabled: true, // ❌ Fetch ทุกครั้งแม้ว่าจะไม่ได้ใช้
    staleTime: 5 * 60 * 1000,
  }
)
```

#### ❌ TaxStatusTable.tsx
```typescript
// ปัญหา: ไม่มี staleTime ทำให้ต้อง fetch ทุกครั้ง
const { data: taxDataResponse } = useQuery(
  ['monthly-tax-data', 'tax-status', ...],
  () => monthlyTaxDataService.getList(...),
  {
    keepPreviousData: true, // ✅ ดีแล้ว
    // ❌ ไม่มี staleTime - ใช้ค่า default (0)
  }
)
```

### 2. Backend API - การ Query ไม่เหมาะสม

#### ❌ GET /api/monthly-tax-data/:build/:year/:month
- ไม่ได้ SELECT `first_name` และ `nick_name` สำหรับ employees (e1-e7)
- ทำให้ frontend ต้อง fetch employees list เพิ่มเติมเพื่อหา nickname

#### ❌ GET /api/monthly-tax-data (List)
- มีการ JOIN กับ employees table 7 ครั้ง (e1-e7)
- SELECT fields มากมาย (80+ fields) ซึ่งอาจไม่จำเป็นทั้งหมด

---

## ✅ Recommended Optimizations

### 1. Frontend Optimizations

#### ✅ TaxInspectionForm.tsx - เพิ่ม Cache

```typescript
// ✅ แก้ไข: เพิ่ม staleTime และปรับ refetch behavior
const { data: taxData } = useQuery(
  ['monthly-tax-data', buildId, currentYear, currentMonth],
  () => monthlyTaxDataService.getByBuildYearMonth(...),
  {
    enabled: !!buildId && opened,
    staleTime: 30 * 1000, // ✅ Cache 30 วินาที (ข้อมูลไม่ค่อยเปลี่ยนบ่อย)
    refetchOnWindowFocus: false, // ✅ ไม่ต้อง refetch เมื่อ focus window
    refetchOnMount: false, // ✅ ใช้ cache ถ้ามี
  }
)

// ✅ แก้ไข: Fetch employees list เฉพาะเมื่อจำเป็น
const { data: employeesData } = useQuery(
  ['employees-list'],
  () => employeeService.getAll({ limit: 1000, status: 'active' }),
  {
    enabled: false, // ✅ ไม่ fetch อัตโนมัติ
    staleTime: 5 * 60 * 1000, // ✅ Cache 5 นาที
  }
)
```

#### ✅ TaxStatusTable.tsx - เพิ่ม Cache

```typescript
// ✅ แก้ไข: เพิ่ม staleTime
const { data: taxDataResponse } = useQuery(
  ['monthly-tax-data', 'tax-status', ...],
  () => monthlyTaxDataService.getList(...),
  {
    keepPreviousData: true,
    staleTime: 30 * 1000, // ✅ Cache 30 วินาที
  }
)
```

#### ✅ SummaryCard.tsx - ปรับ Cache Time

```typescript
// ✅ แก้ไข: เพิ่ม staleTime จาก 1 นาทีเป็น 2 นาที (ข้อมูล summary ไม่ค่อยเปลี่ยนบ่อย)
const { data: summaryData } = useQuery(
  ['monthly-tax-data-summary', ...],
  () => monthlyTaxDataService.getSummary(...),
  {
    staleTime: 2 * 60 * 1000, // ✅ Cache 2 นาที (เพิ่มจาก 1 นาที)
  }
)
```

### 2. Backend Optimizations

#### ✅ GET /api/monthly-tax-data/:build/:year/:month - เพิ่ม first_name และ nick_name

```sql
-- ✅ แก้ไข: เพิ่ม first_name และ nick_name สำหรับ employees ทั้งหมด
SELECT 
  mtd.id,
  mtd.build,
  c.company_name,
  -- ... other fields ...
  mtd.accounting_responsible,
  e1.full_name as accounting_responsible_name,
  e1.first_name as accounting_responsible_first_name, -- ✅ เพิ่ม
  e1.nick_name as accounting_responsible_nick_name,   -- ✅ เพิ่ม
  mtd.tax_inspection_responsible,
  e2.full_name as tax_inspection_responsible_name,
  e2.first_name as tax_inspection_responsible_first_name, -- ✅ เพิ่ม
  e2.nick_name as tax_inspection_responsible_nick_name,   -- ✅ เพิ่ม
  -- ... repeat for e3, e4, e5, e6, e7 ...
FROM monthly_tax_data mtd
LEFT JOIN clients c ON mtd.build = c.build
LEFT JOIN employees e1 ON mtd.accounting_responsible = e1.employee_id
LEFT JOIN employees e2 ON mtd.tax_inspection_responsible = e2.employee_id
-- ... other JOINs ...
```

**ผลลัพธ์**: Frontend ไม่ต้อง fetch employees list เพิ่มเติม → ลด API calls

#### ✅ GET /api/monthly-tax-data/:id - เพิ่ม first_name และ nick_name

เช่นเดียวกับ endpoint `/:build/:year/:month`

---

## 📊 Expected Performance Improvements

### Before Optimization
- **TaxInspectionForm**: Fetch ทุกครั้งที่เปิด modal (0 cache)
- **TaxStatusTable**: Fetch ทุกครั้งที่ component mount (0 cache)
- **SummaryCard**: Fetch ทุก 1 นาที
- **Backend**: Frontend ต้อง fetch employees list เพิ่มเติม

### After Optimization
- **TaxInspectionForm**: Cache 30 วินาที → ลด API calls ~70%
- **TaxStatusTable**: Cache 30 วินาที → ลด API calls ~70%
- **SummaryCard**: Cache 2 นาที → ลด API calls ~50%
- **Backend**: Frontend ไม่ต้อง fetch employees list → ลด API calls 1 call ต่อการเปิด modal

### Estimated Overall Improvement
- **API Calls**: ลดลง ~60-70%
- **Response Time**: ลดลง ~30-40% (เนื่องจากใช้ cache)
- **Network Traffic**: ลดลง ~50-60%

---

## ⚠️ Important Notes

1. **Cache Time**: 
   - `staleTime: 30 seconds` เหมาะสำหรับข้อมูลที่เปลี่ยนแปลงไม่บ่อย
   - ถ้าต้องการข้อมูล real-time มากขึ้น สามารถลดเป็น `10 seconds` ได้

2. **Refetch Behavior**:
   - `refetchOnWindowFocus: false` - ไม่ refetch เมื่อ focus window (ลด unnecessary requests)
   - `refetchOnMount: false` - ใช้ cache ถ้ามี (ลด unnecessary requests)
   - ข้อมูลจะยังคงถูก invalidate เมื่อมีการบันทึก (ผ่าน `queryClient.invalidateQueries`)

3. **Backend Changes**:
   - การเพิ่ม `first_name` และ `nick_name` ใน response จะไม่กระทบกับ frontend ที่มีอยู่
   - Frontend จะใช้ข้อมูลจาก response โดยตรงแทนการ fetch employees list เพิ่มเติม

4. **No Breaking Changes**:
   - การเปลี่ยนแปลงทั้งหมดเป็น backward compatible
   - ไม่กระทบกับฟีเจอร์และการทำงานที่มีอยู่

---

## 🎯 Implementation Priority

### High Priority (ทำทันที)
1. ✅ เพิ่ม `staleTime` ใน TaxInspectionForm
2. ✅ เพิ่ม `staleTime` ใน TaxStatusTable
3. ✅ เพิ่ม `first_name` และ `nick_name` ใน backend API endpoints

### Medium Priority (ทำตามโอกาส)
1. ✅ ปรับ `refetchOnWindowFocus` และ `refetchOnMount` ใน TaxInspectionForm
2. ✅ เพิ่ม `staleTime` ใน SummaryCard

### Low Priority (ทำเมื่อมีเวลา)
1. ✅ ปรับ employees list fetching ใน TaxInspectionForm

---

## 📝 Testing Checklist

- [ ] ตรวจสอบว่า cache ทำงานถูกต้อง
- [ ] ตรวจสอบว่าข้อมูลยังคงถูก invalidate เมื่อบันทึก
- [ ] ตรวจสอบว่า backend ส่ง `first_name` และ `nick_name` มาครบถ้วน
- [ ] ตรวจสอบว่า frontend ไม่ต้อง fetch employees list เพิ่มเติม
- [ ] ตรวจสอบว่า performance ดีขึ้นจริง

---

**Last Updated**: 2026-02-02  
**Maintainer**: Cursor AI
