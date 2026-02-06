# 🔧 Migration 004 - Fix Guide

## ❌ ปัญหาที่พบ

SQL Error เมื่อรัน migration `004_create_login_attempts_table.sql`:

```sql
CREATE INDEX idx_login_attempts_failed_recent ON login_attempts(username, attempted_at, success) 
WHERE success = FALSE;
```

**Error**: MySQL/MariaDB ไม่รองรับ `WHERE` clause ใน `CREATE INDEX`

## ✅ วิธีแก้ไข

### วิธีที่ 1: ใช้ไฟล์ที่แก้ไขแล้ว (แนะนำ)

ใช้ไฟล์ `004_create_login_attempts_table.sql` ที่แก้ไขแล้ว (ลบ `WHERE` clause ออก)

### วิธีที่ 2: แก้ไขด้วยตนเอง

ถ้ายังรัน SQL อยู่ ให้ลบบรรทัดสุดท้ายออก:

**ลบ**:
```sql
WHERE success = FALSE;
```

**เหลือ**:
```sql
CREATE INDEX idx_login_attempts_failed_recent ON login_attempts(username, attempted_at, success);
```

## 📝 คำอธิบาย

### MySQL/MariaDB vs PostgreSQL

- **PostgreSQL**: รองรับ **partial index** (filtered index) ด้วย `WHERE` clause
- **MySQL/MariaDB**: **ไม่รองรับ** partial index

### Composite Index ที่ใช้

แม้ไม่มี `WHERE` clause แต่ composite index `(username, attempted_at, success)` ยังช่วยเพิ่มประสิทธิภาพได้:

- Query จะใช้ index นี้
- Filter ด้วย `WHERE success = FALSE` ใน application code
- MySQL optimizer จะใช้ index อย่างมีประสิทธิภาพ

## ✅ SQL ที่แก้ไขแล้ว

```sql
CREATE TABLE IF NOT EXISTS login_attempts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NULL,
  username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NULL,
  success BOOLEAN DEFAULT FALSE,
  failure_reason VARCHAR(100) NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_user_id (user_id),
  INDEX idx_login_attempts_username (username),
  INDEX idx_login_attempts_ip_address (ip_address),
  INDEX idx_login_attempts_attempted_at (attempted_at),
  INDEX idx_login_attempts_success (success),
  INDEX idx_login_attempts_failed_recent (username, attempted_at, success),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🧪 ทดสอบ

หลังจากรัน migration แล้ว ทดสอบว่า table สร้างสำเร็จ:

```sql
-- ตรวจสอบว่า table สร้างแล้ว
SHOW TABLES LIKE 'login_attempts';

-- ตรวจสอบ structure
DESCRIBE login_attempts;

-- ตรวจสอบ indexes
SHOW INDEXES FROM login_attempts;
```

---

**Last Updated**: 2026-01-29  
**Status**: ✅ Fixed
