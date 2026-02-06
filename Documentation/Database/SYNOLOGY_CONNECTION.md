# 🏠 Synology NAS Database Connection Guide

## 📋 Overview

คู่มือการเชื่อมต่อ Database ที่อยู่บน Synology NAS สำหรับ Backend API

## ⚠️ ปัญหาที่พบบ่อย

### Error: `getaddrinfo ENOTFOUND buildmeupconsultant.direct.quickconnect.to:23464`

**สาเหตุ**: 
- Port `23464` เป็น port ของ **phpMyAdmin** (web interface) ไม่ใช่ MySQL port
- ไม่ควรใส่ port ใน `DB_HOST`
- QuickConnect host อาจจะไม่สามารถใช้เชื่อมต่อ MySQL โดยตรงได้

## ✅ วิธีแก้ไข

### วิธีที่ 1: ใช้ Local IP Address (แนะนำที่สุด)

**ขั้นตอน**:

1. **หา Local IP Address ของ Synology NAS**:
   - เปิด Synology DSM
   - ไปที่ **Control Panel > Network > Network Interface**
   - ดู IP Address (เช่น `192.168.1.100` หรือ `10.0.0.50`)

2. **แก้ไขไฟล์ `backend/.env`**:

```env
# Database Configuration
DB_HOST=192.168.1.100  # เปลี่ยนเป็น IP Address จริงของ NAS (ไม่มี port)
DB_PORT=3306           # MySQL port (ไม่ใช่ 23464)
DB_USER=root
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

**สำคัญ**: 
- ❌ อย่าใส่ port ใน `DB_HOST` (เช่น `buildmeupconsultant.direct.quickconnect.to:23464`)
- ✅ แยกเป็น `DB_HOST` และ `DB_PORT` แทน

### วิธีที่ 2: ใช้ QuickConnect Host (ถ้า MySQL port เปิดไว้)

**แก้ไขไฟล์ `backend/.env`**:

```env
DB_HOST=buildmeupconsultant.direct.quickconnect.to  # ไม่มี port
DB_PORT=3306                                         # MySQL port
```

**หมายเหตุ**: 
- Port 23464 เป็น port ของ phpMyAdmin (web)
- MySQL port ปกติคือ 3306 (หรือตามที่ตั้งค่าไว้ใน Synology)

### วิธีที่ 3: ตรวจสอบ MySQL Port ใน Synology

1. เปิด **Synology DSM**
2. ไปที่ **Package Center**
3. เปิด **MariaDB 10** หรือ **MySQL** package
4. ดู **Port** ที่ตั้งค่าไว้ (ปกติคือ 3306)
5. ใช้ port นั้นใน `DB_PORT`

## 🔧 ขั้นตอนการแก้ไข (Step by Step)

### Step 1: แก้ไขไฟล์ `.env`

เปิดไฟล์ `backend/.env` และแก้ไข:

```env
# ❌ ผิด (มี port ใน host)
DB_HOST=buildmeupconsultant.direct.quickconnect.to:23464

# ✅ ถูก (แยก host และ port)
DB_HOST=192.168.1.100  # หรือ buildmeupconsultant.direct.quickconnect.to
DB_PORT=3306
```

### Step 2: ทดสอบการเชื่อมต่อ

```bash
cd backend
node scripts/test-db-connection.js
```

### Step 3: ถ้ายังไม่ได้

ลองใช้ Local IP Address:

1. หา IP Address ของ NAS (จาก Synology DSM)
2. แก้ไข `DB_HOST` เป็น IP นั้น
3. ทดสอบอีกครั้ง

## 🧪 ตัวอย่างการตั้งค่า

### สำหรับ Local Network (แนะนำ)

```env
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

### สำหรับ QuickConnect (ถ้า port เปิดไว้)

```env
DB_HOST=buildmeupconsultant.direct.quickconnect.to
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Buildmeup23.04.2022
DB_NAME=bmu_work_management
```

## 🔍 ตรวจสอบ MySQL Port

### ใน Synology DSM:

1. **Package Center** > **MariaDB 10** หรือ **MySQL**
2. ดู **Port** ที่ตั้งค่าไว้
3. หรือดูที่ **Info** > **Port Settings**

### ใน phpMyAdmin:

1. ดูที่ URL: `https://buildmeupconsultant.direct.quickconnect.to:23464`
2. Port `23464` = phpMyAdmin port (web interface)
3. MySQL port = 3306 (default) หรือตามที่ตั้งค่าไว้

## 🚨 Troubleshooting

### Error: `getaddrinfo ENOTFOUND`

**สาเหตุ**: Host name ไม่ถูกต้องหรือไม่สามารถ resolve ได้

**วิธีแก้**:
- ใช้ Local IP Address แทน QuickConnect host
- ตรวจสอบ Network connection

### Error: `Access denied for user 'root'@'184.22.100.243'` ✅ (ปัญหาปัจจุบัน)

**สาเหตุ**: User `root` ไม่มีสิทธิ์เข้าถึงจาก IP address ที่ระบุ

**วิธีแก้** (เลือกวิธีใดวิธีหนึ่ง):

**วิธีที่ 1: เพิ่มสิทธิ์ผ่าน phpMyAdmin** (แนะนำ):
1. เข้า phpMyAdmin: `https://buildmeupconsultant.direct.quickconnect.to:23464`
2. ไปที่แท็บ **User accounts**
3. คลิกที่ user `root` > **Edit privileges**
4. ในส่วน **Login Information**:
   - เปลี่ยน **Host name** เป็น `%` (ทุก host)
   - หรือเพิ่ม host: `184.22.100.243`
5. คลิก **Go** เพื่อบันทึก

**วิธีที่ 2: ใช้ SQL Command**:
1. ไปที่แท็บ **SQL** ใน phpMyAdmin
2. รันคำสั่ง:
```sql
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'Buildmeup23.04.2022' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

**วิธีที่ 3: ใช้ Local IP Address**:
- ถ้า Backend อยู่บน network เดียวกับ NAS
- ใช้ Local IP ของ NAS แทน QuickConnect host
- User `root`@'localhost' อาจจะมีสิทธิ์อยู่แล้ว

**ดูรายละเอียดเพิ่มเติม**: `Documentation/Database/FIX_USER_PERMISSIONS.md`

### Error: `Can't connect to MySQL server`

**สาเหตุ**: MySQL port ไม่เปิดหรือไม่สามารถเข้าถึงได้

**วิธีแก้**:
1. ตรวจสอบว่า MySQL/MariaDB กำลังรันอยู่
2. ตรวจสอบ Firewall settings ใน Synology
3. ตรวจสอบ MySQL port ที่ตั้งค่าไว้
4. ลองใช้ Local IP address

## 📝 Checklist

- [ ] ลบ port ออกจาก `DB_HOST` (ไม่ใส่ `:23464`)
- [ ] แยก `DB_HOST` และ `DB_PORT` ให้ถูกต้อง
- [ ] ใช้ MySQL port (3306) ไม่ใช่ phpMyAdmin port (23464)
- [ ] ทดสอบด้วย Local IP address ก่อน
- [ ] ตรวจสอบ MySQL port ใน Synology DSM
- [ ] ตรวจสอบ Firewall settings

---

**Last Updated**: 2026-01-29
