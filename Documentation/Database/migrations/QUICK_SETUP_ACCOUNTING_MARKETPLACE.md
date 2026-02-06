# 🚀 Quick Setup: Accounting Marketplace Migrations

## ⚠️ ปัญหา: Table 'accounting_marketplace_listings' doesn't exist

ถ้าพบ error นี้ แสดงว่าตาราง `accounting_marketplace_listings` ยังไม่ได้ถูกสร้างในฐานข้อมูล

## ✅ วิธีแก้ไข

### วิธีที่ 1: รันผ่าน phpMyAdmin (แนะนำ)

1. เปิด phpMyAdmin
2. เลือก database `bmu_work_management`
3. คลิกแท็บ **SQL**
4. คัดลอกเนื้อหาจากไฟล์ `032_033_accounting_marketplace_complete.sql`
5. วางใน SQL tab
6. คลิก **Go** เพื่อรัน

### วิธีที่ 2: รันผ่าน MySQL CLI

```bash
# ไปที่โฟลเดอร์ Documentation/Database/migrations
cd Documentation/Database/migrations

# รัน migration
mysql -u root -p bmu_work_management < 032_033_accounting_marketplace_complete.sql
```

### วิธีที่ 3: รันทีละไฟล์

```sql
-- ใน phpMyAdmin หรือ MySQL CLI
USE bmu_work_management;

-- Migration 032: Create table
SOURCE migrations/032_create_accounting_marketplace_listings_table.sql;

-- Migration 033: Add notification type
SOURCE migrations/033_add_accounting_marketplace_notification_type.sql;
```

## ✅ ตรวจสอบว่าสร้างสำเร็จ

รันคำสั่ง SQL ต่อไปนี้:

```sql
-- ตรวจสอบว่าตารางถูกสร้างแล้ว
SHOW TABLES LIKE 'accounting_marketplace_listings';

-- ตรวจสอบโครงสร้างตาราง
DESCRIBE accounting_marketplace_listings;

-- ตรวจสอบ notification type
SHOW COLUMNS FROM notifications WHERE Field = 'type';
```

## 🔍 Troubleshooting

### Error: Table already exists
- ตารางถูกสร้างแล้ว ไม่ต้องทำอะไร

### Error: Unknown column 'type' in 'field list'
- ตาราง `notifications` อาจยังไม่มี ให้รัน migration 007 ก่อน

### Error: Foreign key constraint fails
- ตรวจสอบว่าตาราง `clients` และ `employees` มีอยู่แล้ว

---

**Last Updated**: 2026-02-04
