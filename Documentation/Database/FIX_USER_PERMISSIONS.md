# 🔧 Fix User Permissions - MariaDB/MySQL

## 📋 Problem

Error: `Access denied for user 'root'@'184.22.100.243' (using password: YES)`

**สาเหตุ**: User `root` ไม่มีสิทธิ์เข้าถึงจาก IP address ที่ระบุ

## ✅ วิธีแก้ไข

### วิธีที่ 1: เพิ่มสิทธิ์ให้ user root จากทุก host (แนะนำ)

**ใน phpMyAdmin**:

1. ไปที่แท็บ **User accounts**
2. คลิกที่ user `root`
3. คลิก **Edit privileges**
4. ในส่วน **Login Information**:
   - **Host name**: เปลี่ยนเป็น `%` (หมายถึงทุก host)
   - หรือเพิ่ม host เฉพาะ: `184.22.100.243`
5. คลิก **Go** เพื่อบันทึก

**หรือใช้ SQL Command**:

```sql
-- วิธีที่ 1: อนุญาตทุก host
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'Buildmeup23.04.2022' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- วิธีที่ 2: อนุญาตเฉพาะ IP ที่ระบุ
GRANT ALL PRIVILEGES ON *.* TO 'root'@'184.22.100.243' IDENTIFIED BY 'Buildmeup23.04.2022' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### วิธีที่ 2: สร้าง user ใหม่สำหรับ Backend API

**ใน phpMyAdmin**:

1. ไปที่แท็บ **User accounts**
2. คลิก **Add user account**
3. ตั้งค่า:
   - **User name**: `bmu_api` (หรือชื่ออื่น)
   - **Host name**: `%` (ทุก host) หรือ IP เฉพาะ
   - **Password**: ตั้ง password ใหม่
   - **Privileges**: เลือก `SELECT`, `INSERT`, `UPDATE`, `DELETE` หรือ `ALL PRIVILEGES`
4. คลิก **Go**

**หรือใช้ SQL Command**:

```sql
CREATE USER 'bmu_api'@'%' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON bmu_work_management.* TO 'bmu_api'@'%';
FLUSH PRIVILEGES;
```

แล้วแก้ไข `.env`:
```env
DB_USER=bmu_api
DB_PASSWORD=your-secure-password
```

### วิธีที่ 3: ใช้ Local IP Address (ถ้า Backend อยู่บน network เดียวกัน)

ถ้า Backend รันบนเครื่องที่อยู่ใน network เดียวกับ NAS:

1. หา Local IP ของ NAS (เช่น `192.168.1.100`)
2. แก้ไข `.env`:
```env
DB_HOST=192.168.1.100
```

3. User `root`@'localhost' หรือ `root`@'192.168.1.x' อาจจะมีสิทธิ์อยู่แล้ว

## 🔍 ตรวจสอบ User Permissions

**ใน phpMyAdmin**:

1. ไปที่ **User accounts**
2. คลิกที่ user `root`
3. ดู **Host** ที่มีสิทธิ์ (เช่น `localhost`, `127.0.0.1`, `%`)
4. ถ้าไม่มี `%` หรือ IP ของคุณ → ต้องเพิ่ม

**หรือใช้ SQL Query**:

```sql
SELECT user, host FROM mysql.user WHERE user = 'root';
```

## 📝 Step-by-Step Guide

### ขั้นตอนที่ 1: เข้า phpMyAdmin

1. เปิด `https://buildmeupconsultant.direct.quickconnect.to:23464`
2. Login ด้วย user `root` และ password `Buildmeup23.04.2022`

### ขั้นตอนที่ 2: แก้ไข User Permissions

**Option A: ใช้ phpMyAdmin UI**

1. คลิกแท็บ **User accounts** (ด้านบน)
2. หา user `root` ในตาราง
3. คลิก **Edit privileges** (ไอคอนแก้ไข)
4. ในส่วน **Login Information**:
   - ดู **Host name** ปัจจุบัน
   - ถ้าเป็น `localhost` หรือ IP เฉพาะ → ต้องเพิ่ม `%` หรือ IP ของคุณ
5. คลิก **Go** เพื่อบันทึก

**Option B: ใช้ SQL Tab**

1. คลิกแท็บ **SQL**
2. รันคำสั่ง:

```sql
-- ตรวจสอบ users ปัจจุบัน
SELECT user, host FROM mysql.user WHERE user = 'root';

-- เพิ่มสิทธิ์ให้ root จากทุก host
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'Buildmeup23.04.2022' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### ขั้นตอนที่ 3: ทดสอบการเชื่อมต่อ

```bash
cd backend
node scripts/test-db-connection.js
```

## 🚨 Troubleshooting

### ถ้ายังไม่ได้หลังจากเพิ่มสิทธิ์

1. **ตรวจสอบ Password**:
   - ลอง reset password ใน phpMyAdmin
   - ใช้ปุ่ม "Reset root password"

2. **ตรวจสอบ Firewall**:
   - ใน Synology DSM: Control Panel > Security > Firewall
   - ตรวจสอบว่า port 3306 เปิดไว้

3. **ลองใช้ Local IP**:
   - ใช้ IP address ของ NAS แทน QuickConnect host
   - อาจจะ user `root`@'localhost' มีสิทธิ์อยู่แล้ว

---

**Last Updated**: 2026-01-29
