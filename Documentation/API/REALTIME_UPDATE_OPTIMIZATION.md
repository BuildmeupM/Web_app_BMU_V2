# ⚡ Real-time Update Optimization - การอัพเดทแบบเรียลไทม์

## 📋 Overview

เอกสารนี้อธิบายวิธีการปรับปรุงระบบให้อัพเดทข้อมูลในตาราง "รายการงานที่รับผิดชอบ" (TaxStatusTable) แบบเรียลไทม์ทันทีหลังจากกดบันทึกข้อมูลในฟอร์มสถานะภาษีประจำเดือน (TaxInspectionForm)

**Last Updated**: 2026-02-03

---

## 🎯 เป้าหมาย

- ✅ อัพเดทข้อมูลในตารางทันทีหลังจากบันทึกสำเร็จ (0 วินาที)
- ✅ ไม่ต้องรอ refetch จาก server
- ✅ แสดงสถานะที่ถูกต้องทันที
- ✅ ไม่ต้องเปลี่ยน API (ใช้ React Query cache management)

---

## 📊 สถานะปัจจุบัน

### 1. Cache Update Mechanism

**ปัจจุบัน:**
- ✅ มีการอัพเดท cache ทันทีด้วย `setQueryData` ใน `TaxInspectionForm.tsx`
- ✅ มีการ invalidate และ refetch queries หลังจากบันทึกสำเร็จ
- ⚠️ แต่ `TaxStatusTable` ใช้ `staleTime: 30 * 1000` และ `refetchOnMount: false`

**ปัญหา:**
- Cache อาจไม่ถูกอัพเดททันทีถ้า query key ไม่ match
- การ refetch อาจใช้เวลานาน (0.5-2 วินาที)
- ผู้ใช้ต้องรอ refetch เสร็จก่อนเห็นการเปลี่ยนแปลง

### 2. Query Configuration

**TaxStatusTable.tsx:**
```typescript
useQuery(
  ['monthly-tax-data', 'tax-status', page, limit, employeeId, year, month, filters...],
  () => monthlyTaxDataService.getList({...}),
  {
    keepPreviousData: true,
    staleTime: 30 * 1000, // ⚠️ Cache 30 วินาที
    refetchOnMount: false, // ⚠️ ไม่ refetch เมื่อ mount
    enabled: !!employeeId,
  }
)
```

**TaxInspectionForm.tsx (onSuccess):**
```typescript
// อัพเดท cache ทันที
queryClient.setQueryData(['monthly-tax-data', buildId, year, month], updatedData)

// อัพเดท list cache
const matched = queryClient.getQueriesData({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false })
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

// Invalidate และ refetch
queryClient.invalidateQueries({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false })
queryClient.refetchQueries({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false })
```

---

## ✅ วิธีแก้ไข (Recommended)

### Option 1: ปรับปรุง Cache Update (แนะนำ - ไม่ต้องเปลี่ยน API)

**ข้อดี:**
- ✅ ไม่ต้องเปลี่ยน API
- ✅ ใช้ React Query cache management ที่มีอยู่แล้ว
- ✅ อัพเดททันที (0 วินาที)
- ✅ ง่ายต่อการ implement

**การแก้ไข:**

#### 1. ปรับ `TaxStatusTable` Query Configuration

```typescript
useQuery(
  ['monthly-tax-data', 'tax-status', page, limit, employeeId, year, month, filters...],
  () => monthlyTaxDataService.getList({...}),
  {
    keepPreviousData: true,
    staleTime: 0, // ✅ Cache จะ stale ทันที (เพื่อให้ refetch ทันทีเมื่อ invalidate)
    refetchOnMount: true, // ✅ Refetch เมื่อ mount (เพื่อให้ได้ข้อมูลล่าสุด)
    enabled: !!employeeId,
  }
)
```

#### 2. ปรับปรุง Cache Update ใน `TaxInspectionForm`

**เพิ่มการอัพเดท cache ให้ครอบคลุมมากขึ้น:**

```typescript
// ใน onSuccess handler ของ updateMutation
const currentBuildId = buildId

if (currentBuildId && updatedData) {
  // 1. อัพเดท detail cache (สำหรับ modal)
  queryClient.setQueryData(['monthly-tax-data', currentBuildId, currentYear, currentMonth], updatedData)
  
  // 2. อัพเดท list cache สำหรับทุกหน้า (Tax Status, Tax Filing, Tax Inspection)
  const listFilters = [
    { queryKey: ['monthly-tax-data', 'tax-status'], exact: false },
    { queryKey: ['monthly-tax-data', 'tax-filing'], exact: false },
    { queryKey: ['monthly-tax-data', 'tax-inspection'], exact: false },
  ]
  
  listFilters.forEach((filters) => {
    const matched = queryClient.getQueriesData(filters)
    
    matched.forEach(([queryKey, cachedData]) => {
      if (!cachedData?.data || !Array.isArray(cachedData.data)) return
      
      const itemInList = cachedData.data.some((item: MonthlyTaxData) => item.id === updatedData.id)
      
      if (itemInList) {
        // ✅ อัพเดท cache ทันทีด้วยข้อมูลจาก backend response
        const updatedItemWithStatus: MonthlyTaxData = {
          ...updatedData,
          pp30_status: updatedData.pp30_status || derivePp30Status(updatedData) || null,
          pp30_form: updatedData.pp30_form || updatedData.pp30_status || null,
        }
        
        queryClient.setQueryData(queryKey, {
          ...cachedData,
          data: cachedData.data.map((item: MonthlyTaxData) =>
            item.id === updatedData.id ? updatedItemWithStatus : item
          ),
        })
      }
    })
  })
  
  // 3. Invalidate และ refetch เพื่อให้แน่ใจว่าข้อมูลตรงกับฐานข้อมูล
  // (ทำใน background - ไม่บล็อก UI)
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false }, { refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['monthly-tax-data', 'tax-filing'], exact: false }, { refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['monthly-tax-data', 'tax-inspection'], exact: false }, { refetchType: 'active' }),
  ]).then(() => {
    // Refetch ใน background (ไม่บล็อก UI)
    queryClient.refetchQueries({ queryKey: ['monthly-tax-data', 'tax-status'], exact: false, type: 'active' })
    queryClient.refetchQueries({ queryKey: ['monthly-tax-data', 'tax-filing'], exact: false, type: 'active' })
    queryClient.refetchQueries({ queryKey: ['monthly-tax-data', 'tax-inspection'], exact: false, type: 'active' })
  })
}
```

**ผลลัพธ์:**
- ✅ ตารางอัพเดททันที (0 วินาที) - ไม่ต้องรอ network request
- ✅ ข้อมูลถูกต้อง (มาจาก backend response)
- ✅ Background refetch เพื่อให้แน่ใจว่าข้อมูลตรงกับฐานข้อมูล

---

### Option 2: เพิ่ม WebSocket/SSE (Advanced - สำหรับอนาคต)

**📖 อ่านเพิ่มเติม**: `Documentation/API/WEBSOCKET_SSE_EXPLANATION.md` - อธิบาย WebSocket และ SSE แบบง่ายๆ

**ข้อดี:**
- ✅ Real-time push updates จาก server
- ✅ ไม่ต้อง polling หรือ refetch
- ✅ รองรับ multiple users (หลายคนเห็นการเปลี่ยนแปลงพร้อมกัน)

**ข้อเสีย:**
- ❌ ต้องเพิ่ม backend support (WebSocket/SSE server)
- ❌ ต้องเพิ่ม frontend WebSocket client
- ❌ ซับซ้อนกว่า Option 1
- ❌ อาจจะ overkill สำหรับ use case นี้

**การ Implement:**

#### Backend (Node.js + Socket.io)

```javascript
// backend/server.js
import { Server } from 'socket.io'

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  // Subscribe to monthly-tax-data updates
  socket.on('subscribe:monthly-tax-data', (data) => {
    socket.join(`monthly-tax-data:${data.employeeId}`)
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// ใน monthly-tax-data route (PUT endpoint)
io.to(`monthly-tax-data:${employeeId}`).emit('monthly-tax-data:updated', {
  id: updatedData.id,
  build: updatedData.build,
  ...updatedData,
})
```

#### Frontend (React Query + Socket.io Client)

```typescript
// src/hooks/useRealtimeUpdates.ts
import { useEffect } from 'react'
import { useQueryClient } from 'react-query'
import { io } from 'socket.io-client'

export function useRealtimeUpdates(employeeId: string | null) {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    if (!employeeId) return
    
    const socket = io(process.env.VITE_BACKEND_URL || 'http://localhost:3001')
    
    socket.on('connect', () => {
      socket.emit('subscribe:monthly-tax-data', { employeeId })
    })
    
    socket.on('monthly-tax-data:updated', (updatedData) => {
      // อัพเดท cache ทันที
      queryClient.setQueryData(['monthly-tax-data', updatedData.build, updatedData.tax_year, updatedData.tax_month], updatedData)
      
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ['monthly-tax-data'], exact: false })
    })
    
    return () => {
      socket.disconnect()
    }
  }, [employeeId, queryClient])
}
```

**ใช้ใน TaxStatusTable:**

```typescript
// src/components/TaxStatus/TaxStatusTable.tsx
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates'

export default function TaxStatusTable({...}) {
  const { employeeId } = useAuthStore()
  
  // ✅ Subscribe to real-time updates
  useRealtimeUpdates(employeeId)
  
  // ... rest of the component
}
```

---

## 📊 ตารางเปรียบเทียบ

| วิธี | อัพเดททันที | ความซับซ้อน | ต้องเปลี่ยน API | เหมาะสำหรับ |
|------|------------|------------|----------------|------------|
| **Option 1: Cache Update** | ✅ (0 วินาที) | ⭐ Low | ❌ ไม่ต้อง | ✅ แนะนำ |
| **Option 2: WebSocket/SSE** | ✅ (0 วินาที) | ⭐⭐⭐ High | ✅ ต้อง | ⏳ อนาคต |

---

## 🚀 Implementation Plan

### Phase 1: ปรับปรุง Cache Update (แนะนำ - ทำทันที)

1. ✅ ปรับ `TaxStatusTable` query configuration:
   - เปลี่ยน `staleTime` เป็น `0`
   - เปลี่ยน `refetchOnMount` เป็น `true`

2. ✅ ปรับปรุง cache update ใน `TaxInspectionForm`:
   - เพิ่มการอัพเดท cache ให้ครอบคลุมมากขึ้น
   - ใช้ `setQueryData` เพื่ออัพเดททันที

3. ✅ ทดสอบ:
   - บันทึกข้อมูลในฟอร์ม
   - ตรวจสอบว่าตารางอัพเดททันทีหรือไม่
   - ตรวจสอบว่าข้อมูลถูกต้องหรือไม่

### Phase 2: เพิ่ม WebSocket/SSE (✅ Completed)

1. ✅ เพิ่ม Socket.io ใน backend (`socket.io@^4.7.2`)
2. ✅ เพิ่ม Socket.io client ใน frontend (`socket.io-client@^4.7.2`)
3. ✅ สร้าง hook `useRealtimeUpdates`
4. ✅ สร้าง WebSocket server ใน `backend/server.js`
5. ✅ สร้าง socketService ใน backend และ frontend
6. ✅ อัพเดท PUT endpoint เพื่อ emit events
7. ✅ อัพเดท components (TaxStatusTable, TaxInspectionTable, TaxFilingTable) เพื่อใช้ hook
8. ⏳ ทดสอบ real-time updates

---

## 📝 หมายเหตุ

- **Option 1** แนะนำให้ทำทันที เพราะง่ายและมีประสิทธิภาพ
- **Option 2** สามารถทำในอนาคตถ้าต้องการ real-time push updates
- การใช้ cache update (Option 1) จะทำให้อัพเดททันที (0 วินาที) และไม่ต้องเปลี่ยน API

---

## 🔗 Related Documentation

- `Documentation/DATA_UPDATE_AFTER_SAVE.md` - การอัพเดทข้อมูลหลังบันทึก
- `Documentation/CACHE_UPDATE_FIX.md` - แก้ไขปัญหา Cache ไม่ถูกอัพเดท
- `Documentation/API/MONTHLY_TAX_DATA_API.md` - API Documentation

---

**Last Updated**: 2026-02-03
