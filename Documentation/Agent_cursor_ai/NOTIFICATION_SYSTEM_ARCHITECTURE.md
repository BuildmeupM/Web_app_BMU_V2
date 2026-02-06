# 🔔 Notification System Architecture - BMU Work Management System

## 🎯 วัตถุประสงค์

เอกสารนี้อธิบายสถาปัตยกรรมของระบบแจ้งเตือน (Notification System) ที่ออกแบบมาเพื่อรองรับการพัฒนาต่อในอนาคต

---

## 📋 Database Schema

### 1. `notifications` Table

ตารางหลักสำหรับเก็บการแจ้งเตือนทั้งหมด

#### Key Features:
- ✅ **Multiple Notification Types**: รองรับหลายประเภทการแจ้งเตือน
- ✅ **Priority System**: low, medium, high, urgent
- ✅ **Category System**: จัดกลุ่มการแจ้งเตือนตามหมวดหมู่
- ✅ **Action Support**: รองรับ action_url และ action_label สำหรับไปยังหน้าที่เกี่ยวข้อง
- ✅ **Metadata Support**: JSON field สำหรับเก็บข้อมูลเพิ่มเติม
- ✅ **Expiration Support**: รองรับการตั้งวันหมดอายุของการแจ้งเตือน
- ✅ **Related Entity Support**: รองรับการเชื่อมโยงกับ entity อื่นๆ

#### Notification Types:
1. **User Management**:
   - `password_change` - มีการเปลี่ยนรหัสผ่าน
   - `user_created` - สร้าง User Account ใหม่
   - `user_updated` - แก้ไข User Account
   - `user_deleted` - ลบ User Account

2. **Leave & WFH**:
   - `leave_request_created` - มีการขอลาใหม่
   - `leave_request_approved` - การลาถูกอนุมัติ
   - `leave_request_rejected` - การลาถูกปฏิเสธ
   - `leave_request_cancelled` - ยกเลิกการลา
   - `wfh_request_created` - มีการขอ WFH ใหม่
   - `wfh_request_approved` - การ WFH ถูกอนุมัติ
   - `wfh_request_rejected` - การ WFH ถูกปฏิเสธ
   - `wfh_request_cancelled` - ยกเลิกการ WFH

3. **Work Assignment**:
   - `work_assignment_created` - สร้างการจัดงานใหม่
   - `work_assignment_updated` - แก้ไขการจัดงาน
   - `work_assignment_deleted` - ลบการจัดงาน

4. **Client Management**:
   - `client_created` - สร้างลูกค้าใหม่
   - `client_updated` - แก้ไขข้อมูลลูกค้า
   - `client_deleted` - ลบลูกค้า
   - `client_import_completed` - นำเข้าข้อมูลลูกค้าเสร็จสิ้น

5. **Tax & Document**:
   - `tax_data_updated` - อัพเดทข้อมูลภาษี
   - `tax_filing_due` - ถึงกำหนดยื่นภาษี
   - `document_entry_completed` - คีย์เอกสารเสร็จสิ้น
   - `document_entry_pending` - มีเอกสารรอคีย์

6. **System & General**:
   - `system` - การแจ้งเตือนจากระบบ
   - `reminder` - การแจ้งเตือนเตือนความจำ
   - `alert` - การแจ้งเตือนเตือนภัย
   - `info` - ข้อมูลทั่วไป

#### Fields:
- `id` - Primary Key (UUID)
- `user_id` - User ID ของผู้ที่ควรได้รับแจ้งเตือน
- `type` - ประเภทการแจ้งเตือน (ENUM)
- `category` - หมวดหมู่การแจ้งเตือน (user_management, leave, work_assignment, client, tax, document, system)
- `priority` - ระดับความสำคัญ (low, medium, high, urgent)
- `title` - หัวข้อการแจ้งเตือน
- `message` - ข้อความการแจ้งเตือน
- `icon` - ชื่อไอคอนที่ใช้แสดง (เช่น TbBell, TbAlertCircle)
- `color` - สีที่ใช้แสดง (เช่น blue, green, orange, red)
- `action_url` - URL สำหรับไปยังหน้าที่เกี่ยวข้อง (เช่น /leave-requests/123)
- `action_label` - ข้อความบนปุ่ม action (เช่น "ดูรายละเอียด", "อนุมัติ")
- `related_user_id` - User ID ที่เกี่ยวข้อง
- `related_entity_type` - ประเภท entity ที่เกี่ยวข้อง (เช่น leave_request, work_assignment, client)
- `related_entity_id` - ID ของ entity ที่เกี่ยวข้อง
- `metadata` - ข้อมูลเพิ่มเติมในรูปแบบ JSON
- `is_read` - สถานะการอ่าน
- `read_at` - เวลาที่อ่าน
- `expires_at` - วันหมดอายุของการแจ้งเตือน
- `created_at` - เวลาที่สร้าง
- `updated_at` - เวลาที่อัปเดตล่าสุด
- `deleted_at` - Soft Delete

#### Indexes:
- `idx_notifications_user_id` - สำหรับ query notifications ของ user
- `idx_notifications_is_read` - สำหรับ filter ตามสถานะการอ่าน
- `idx_notifications_type` - สำหรับ filter ตามประเภท
- `idx_notifications_category` - สำหรับ filter ตามหมวดหมู่
- `idx_notifications_priority` - สำหรับ sort ตามความสำคัญ
- `idx_notifications_created_at` - สำหรับ sort ตามวันที่สร้าง
- `idx_notifications_expires_at` - สำหรับ filter notifications ที่หมดอายุ
- `idx_notifications_related_user_id` - สำหรับ query notifications ที่เกี่ยวข้องกับ user
- `idx_notifications_related_entity` - สำหรับ query notifications ที่เกี่ยวข้องกับ entity
- `idx_notifications_user_read` - Composite index สำหรับ query notifications ของ user ที่ยังไม่อ่าน

### 2. `notification_preferences` Table

ตารางสำหรับตั้งค่าการแจ้งเตือนของแต่ละ user

#### Key Features:
- ✅ **Per-User Preferences**: แต่ละ user สามารถตั้งค่าการแจ้งเตือนได้
- ✅ **Per-Type Preferences**: ตั้งค่าได้ตามประเภทการแจ้งเตือน
- ✅ **Email Support**: รองรับการส่งอีเมลแจ้งเตือนในอนาคต
- ✅ **Push Notification Support**: รองรับการส่ง push notification ในอนาคต

#### Fields:
- `id` - Primary Key (UUID)
- `user_id` - User ID
- `notification_type` - ประเภทการแจ้งเตือน
- `enabled` - เปิด/ปิดการแจ้งเตือนประเภทนี้
- `email_enabled` - ส่งอีเมลแจ้งเตือน (สำหรับอนาคต)
- `push_enabled` - ส่ง push notification (สำหรับอนาคต)
- `created_at` - เวลาที่สร้าง
- `updated_at` - เวลาที่อัปเดตล่าสุด

---

## 🔌 API Endpoints

### GET /api/notifications
ดึงรายการ notifications ของ user ที่ล็อกอินอยู่

**Query Parameters:**
- `is_read` (boolean, optional) - Filter ตามสถานะการอ่าน
- `limit` (number, optional, default: 50) - จำนวน notifications ที่ต้องการ

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "type": "password_change",
      "category": "user_management",
      "priority": "medium",
      "title": "...",
      "message": "...",
      "icon": "TbKey",
      "color": "orange",
      "action_url": "/users",
      "action_label": "ดูรายละเอียด",
      "related_user_id": "...",
      "related_entity_type": "user",
      "related_entity_id": "...",
      "metadata": { "build_code": "001" },
      "is_read": false,
      "read_at": null,
      "expires_at": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "unread_count": 5
}
```

### POST /api/notifications
สร้าง notification ใหม่ (Admin only)

**Request Body:**
```json
{
  "user_id": "...",
  "type": "password_change",
  "category": "user_management",
  "priority": "medium",
  "title": "...",
  "message": "...",
  "icon": "TbKey",
  "color": "orange",
  "action_url": "/users",
  "action_label": "ดูรายละเอียด",
  "related_user_id": "...",
  "related_entity_type": "user",
  "related_entity_id": "...",
  "metadata": { "build_code": "001" },
  "expires_at": null
}
```

### PUT /api/notifications/:id/read
ทำเครื่องหมายว่าอ่านแล้ว

### PUT /api/notifications/read-all
ทำเครื่องหมายว่าอ่านทั้งหมด

### DELETE /api/notifications/:id
ลบ notification (soft delete)

---

## 🎨 Frontend Components

### NotificationsMenu Component
- แสดงการแจ้งเตือนใน Header
- Badge แสดงจำนวนการแจ้งเตือนที่ยังไม่อ่าน
- Dropdown/Menu แสดงรายการการแจ้งเตือน
- รองรับ priority, icon, color, action_url
- Auto-refresh every 30 seconds

---

## 🚀 Future Extensibility

### Planned Features:
1. **Email Notifications**
   - ส่งอีเมลแจ้งเตือนเมื่อมีการแจ้งเตือนใหม่
   - รองรับ email templates
   - รองรับ email scheduling

2. **Push Notifications**
   - ส่ง push notification ไปยัง browser
   - รองรับ mobile app push notifications

3. **Notification Preferences**
   - User สามารถตั้งค่าการแจ้งเตือนได้
   - ตั้งค่าได้ตามประเภทการแจ้งเตือน
   - ตั้งค่าได้ตามความสำคัญ

4. **Notification Templates**
   - สร้าง template สำหรับการแจ้งเตือนแต่ละประเภท
   - รองรับ dynamic content

5. **Notification Scheduling**
   - ตั้งเวลาส่งการแจ้งเตือน
   - รองรับ recurring notifications

6. **Notification Groups/Channels**
   - จัดกลุ่มการแจ้งเตือนตาม channel
   - รองรับ multiple channels (email, push, in-app)

---

## 📝 Usage Examples

### Example 1: สร้าง Notification เมื่อมีการเปลี่ยนรหัสผ่าน
```javascript
await pool.execute(
  `INSERT INTO notifications (
    id, user_id, type, category, priority, title, message,
    icon, color, action_url, related_user_id, related_entity_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    notificationId,
    adminId,
    'password_change',
    'user_management',
    'medium',
    'มีการเปลี่ยนรหัสผ่าน',
    `พนักงาน ${userName} ได้เปลี่ยนรหัสผ่านแล้ว`,
    'TbKey',
    'orange',
    '/users',
    userId,
    'user',
  ]
)
```

### Example 2: สร้าง Notification เมื่อมีการขอลา
```javascript
await pool.execute(
  `INSERT INTO notifications (
    id, user_id, type, category, priority, title, message,
    icon, color, action_url, action_label, related_user_id,
    related_entity_type, related_entity_id, metadata
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    notificationId,
    approverId,
    'leave_request_created',
    'leave',
    'high',
    'มีการขอลาใหม่',
    `พนักงาน ${employeeName} ขอลา ${leaveType} จำนวน ${leaveDays} วัน`,
    'TbCalendar',
    'blue',
    `/leave-requests/${leaveRequestId}`,
    'ดูรายละเอียด',
    requesterId,
    'leave_request',
    leaveRequestId,
    JSON.stringify({ leave_type: leaveType, leave_days: leaveDays }),
  ]
)
```

### Example 3: สร้าง Notification เมื่อถึงกำหนดยื่นภาษี
```javascript
await pool.execute(
  `INSERT INTO notifications (
    id, user_id, type, category, priority, title, message,
    icon, color, action_url, action_label, expires_at, metadata
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    notificationId,
    responsibleUserId,
    'tax_filing_due',
    'tax',
    'urgent',
    'ถึงกำหนดยื่นภาษี',
    `บริษัท ${companyName} (Build: ${buildCode}) ถึงกำหนดยื่นภาษีแล้ว`,
    'TbAlertCircle',
    'red',
    `/tax-filing?build=${buildCode}`,
    'ยื่นภาษี',
    filingDueDate,
    JSON.stringify({ build_code: buildCode, tax_month: taxMonth }),
  ]
)
```

---

## 🔒 Security Considerations

1. **Access Control**: User สามารถดูเฉพาะ notifications ของตัวเองเท่านั้น
2. **Data Validation**: Validate ข้อมูลก่อนสร้าง notification
3. **SQL Injection Prevention**: ใช้ parameterized queries
4. **Rate Limiting**: จำกัดจำนวน notifications ที่สร้างได้ต่อเวลา

---

## 📊 Performance Considerations

1. **Indexes**: มี indexes สำหรับ query ที่ใช้บ่อย
2. **Expiration**: Filter notifications ที่หมดอายุแล้ว
3. **Pagination**: รองรับ pagination สำหรับ notifications จำนวนมาก
4. **Caching**: สามารถ cache notifications ที่อ่านแล้ว

---

**Last Updated**: 2026-01-31  
**Status**: ✅ Complete (พร้อมรองรับการพัฒนาต่อในอนาคต)  
**Maintainer**: Cursor AI
