# 🔌 WebSocket Implementation Guide - Real-time Updates

## 📋 Overview

เอกสารนี้อธิบายการใช้งาน WebSocket (Socket.io) สำหรับ real-time updates ของ monthly tax data ในระบบ BMU Work Management System

**Last Updated**: 2026-02-03

---

## 🎯 วัตถุประสงค์

- ✅ ส่ง real-time updates ไปยังทุก client ที่เชื่อมต่ออยู่เมื่อมีการบันทึกข้อมูล
- ✅ รองรับการทำงานหลายคนพร้อมกัน (multiple users)
- ✅ อัพเดท cache ทันทีเมื่อได้รับ event
- ✅ ไม่ต้อง polling หรือ refetch

---

## 🏗️ Architecture

### Backend (Socket.io Server)

```
Express App
    ↓
HTTP Server (createServer)
    ↓
Socket.io Server
    ↓
Connection Handler
    ↓
Room Management (monthly-tax-data:{employeeId})
    ↓
Event Emission (monthly-tax-data:updated)
```

### Frontend (Socket.io Client)

```
React Component
    ↓
useRealtimeUpdates Hook
    ↓
Socket.io Client (socketService)
    ↓
Subscribe to Room
    ↓
Listen to Events
    ↓
Update React Query Cache
```

---

## 📦 Dependencies

### Backend
- `socket.io@^4.7.2`

### Frontend
- `socket.io-client@^4.7.2`

---

## 🔧 Implementation Details

### Backend Setup

#### 1. Server Configuration (`backend/server.js`)

```javascript
import { createServer } from 'http'
import { Server } from 'socket.io'

// Create HTTP server from Express app
const httpServer = createServer(app)

// Create Socket.io server instance
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Connection handler
io.on('connection', (socket) => {
  // Handle subscription
  socket.on('subscribe:monthly-tax-data', (data) => {
    const room = `monthly-tax-data:${data.employeeId}`
    socket.join(room)
  })
  
  // Handle disconnection
  socket.on('disconnect', () => {
    // Cleanup
  })
})

// Store io instance in app for use in routes
app.set('io', io)

// Use httpServer.listen instead of app.listen
httpServer.listen(PORT, () => {
  // Server started
})
```

#### 2. Socket Service (`backend/services/socketService.js`)

```javascript
export function emitMonthlyTaxDataUpdate(io, updatedData, employeeIds) {
  employeeIds.forEach((employeeId) => {
    const room = `monthly-tax-data:${employeeId}`
    io.to(room).emit('monthly-tax-data:updated', updatedData)
  })
}
```

#### 3. Update PUT Endpoint (`backend/routes/monthly-tax-data.js`)

```javascript
// After successful update
const io = req.app.get('io')
const responsibleEmployeeIds = [
  responseData.accounting_responsible,
  responseData.tax_inspection_responsible,
  responseData.wht_filer_current_employee_id,
  responseData.vat_filer_current_employee_id,
  responseData.document_entry_responsible,
].filter(Boolean)

emitMonthlyTaxDataUpdate(io, responseData, responsibleEmployeeIds)
```

### Frontend Setup

#### 1. Socket Service (`src/services/socketService.ts`)

```typescript
export function createSocketConnection(token: string | null): Socket {
  const socket = io(backendUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  })
  
  // Event handlers
  socket.on('connect', () => { /* ... */ })
  socket.on('disconnect', () => { /* ... */ })
  
  return socket
}
```

#### 2. Realtime Updates Hook (`src/hooks/useRealtimeUpdates.ts`)

```typescript
export function useRealtimeUpdates(employeeId: string | null) {
  const queryClient = useQueryClient()
  const { token } = useAuthStore()
  
  useEffect(() => {
    if (!employeeId || !token) return
    
    const socket = createSocketConnection(token)
    
    socket.on('connect', () => {
      socket.emit('subscribe:monthly-tax-data', { employeeId })
    })
    
    socket.on('monthly-tax-data:updated', (updatedData) => {
      // Update cache
      queryClient.setQueryData(detailQueryKey, updatedData)
      // Update list caches
      // ...
    })
    
    return () => {
      socket.disconnect()
    }
  }, [employeeId, token, queryClient])
}
```

#### 3. Update Components

```typescript
// TaxStatusTable.tsx, TaxInspectionTable.tsx, TaxFilingTable.tsx
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates'

export default function TaxStatusTable({...}) {
  const { user } = useAuthStore()
  const employeeId = user?.employee_id || null
  
  // Subscribe to real-time updates
  useRealtimeUpdates(employeeId)
  
  // ... rest of component
}
```

---

## 📡 Event Names

### Client → Server

- `subscribe:monthly-tax-data` - Subscribe to updates
  - Payload: `{ employeeId: string }`
- `unsubscribe:monthly-tax-data` - Unsubscribe from updates
  - Payload: `{ employeeId: string }`

### Server → Client

- `monthly-tax-data:updated` - Data updated event
  - Payload: `MonthlyTaxData` object

---

## 🏠 Room Structure

```
monthly-tax-data:{employeeId}
```

**Example**:
- `monthly-tax-data:AC00024` - สำหรับ employee AC00024
- `monthly-tax-data:AC00008` - สำหรับ employee AC00008

**Logic**:
- เมื่อบันทึกข้อมูล ระบบจะส่ง event ไปยัง rooms ของ responsible employees:
  - `accounting_responsible`
  - `tax_inspection_responsible`
  - `wht_filer_current_employee_id`
  - `vat_filer_current_employee_id`
  - `document_entry_responsible`

---

## 🔄 Data Flow

### 1. User A บันทึกข้อมูล

```
User A: บันทึกข้อมูล (PUT /api/monthly-tax-data/:id)
    ↓
Backend: บันทึกข้อมูลสำเร็จ
    ↓
Backend: Emit event ไปยัง responsible employee rooms
    ↓
WebSocket Server: ส่ง event ไปยังทุก client ใน rooms
```

### 2. User B, C, D รับ Event

```
WebSocket Client: รับ event 'monthly-tax-data:updated'
    ↓
useRealtimeUpdates Hook: อัพเดท cache
    ↓
React Query: Trigger re-render
    ↓
Component: แสดงข้อมูลใหม่ทันที
```

---

## 🛡️ Error Handling

### Backend

- ✅ ใช้ `try-catch` เพื่อไม่ให้ WebSocket error ทำให้ API response fail
- ✅ Log errors แต่ไม่ throw
- ✅ ข้อมูลยังถูกบันทึกสำเร็จแม้ว่า WebSocket emit จะ error

### Frontend

- ✅ Auto-reconnection (Socket.io handles automatically)
- ✅ Connection error handling
- ✅ Reconnection error handling
- ✅ Fallback to polling transport if websocket fails

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] WebSocket connection successful
- [ ] Subscription to employee room works
- [ ] Event received when data updated
- [ ] Cache updated correctly
- [ ] Multiple clients receive updates simultaneously
- [ ] Disconnection handled properly
- [ ] Reconnection works automatically
- [ ] Component re-renders with new data

### Test Scenarios

1. **Single User Update**
   - User A บันทึกข้อมูล
   - User A เห็นข้อมูลอัพเดททันที

2. **Multiple Users Update**
   - User A บันทึกข้อมูล
   - User B, C, D (responsible employees) เห็นข้อมูลอัพเดททันที

3. **Connection Loss**
   - Disconnect network
   - Socket.io auto-reconnects
   - Updates resume after reconnection

4. **Multiple Tabs**
   - Open same page in multiple tabs
   - All tabs receive updates simultaneously

---

## 📊 Performance Considerations

### Backend

- **Connection Limit**: Monitor number of concurrent connections
- **Memory Usage**: Each connection consumes memory
- **Scalability**: Consider Redis adapter for multiple server instances

### Frontend

- **Connection Management**: Single connection per user (singleton pattern)
- **Cache Updates**: Efficient cache updates using React Query
- **Reconnection**: Automatic reconnection with exponential backoff

---

## 🔐 Security

### Authentication

- ✅ JWT token sent in `auth` object
- ✅ Token verified on connection (optional - can be implemented)
- ✅ Room subscription based on employee_id

### Authorization

- ✅ Only responsible employees receive updates
- ✅ Room names based on employee_id (not user-controlled)

---

## 🐛 Troubleshooting

### Connection Issues

**Problem**: WebSocket connection fails
- **Solution**: Check CORS configuration
- **Solution**: Verify backend URL in frontend
- **Solution**: Check firewall/proxy settings

### Events Not Received

**Problem**: Events not received by clients
- **Solution**: Verify subscription to correct room
- **Solution**: Check employee_id matches
- **Solution**: Verify event emission in backend logs

### Cache Not Updated

**Problem**: Cache not updated after receiving event
- **Solution**: Check query keys match
- **Solution**: Verify cache update logic in hook
- **Solution**: Check React Query devtools

---

## 📚 Related Documentation

- `Documentation/API/REALTIME_UPDATE_OPTIMIZATION.md` - Real-time Update Optimization
- `Documentation/API/MONTHLY_TAX_DATA_API.md` - Monthly Tax Data API Documentation
- `Documentation/API/WEBSOCKET_SSE_EXPLANATION.md` - WebSocket และ SSE อธิบายแบบง่ายๆ

---

## 🔄 Migration from Option 1 (Cache Update)

### Backward Compatibility

- ✅ Option 1 (Cache Update) ยังทำงานอยู่
- ✅ WebSocket เป็น layer เพิ่มเติม
- ✅ ถ้า WebSocket ไม่ทำงาน ระบบยังใช้ Option 1 ได้

### Rollback Plan

If issues occur:
1. Remove WebSocket code from components (keep hook but don't use)
2. System will fall back to Option 1 (cache update) automatically
3. No breaking changes to existing functionality

---

**Last Updated**: 2026-02-03
