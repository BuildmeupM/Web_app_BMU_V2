-- Migration: 002_insert_initial_users.sql
-- Description: Insert ข้อมูล users เริ่มต้น 27 รายการ
-- Created: 2026-01-29
-- Note: Password จะต้อง hash ด้วย bcrypt ก่อน insert (ใช้ bcrypt hash ที่มีความยาว 60 ตัวอักษร)

-- หมายเหตุ: 
-- 1. ต้อง hash password ด้วย bcrypt ก่อน insert
-- 2. ใช้ bcrypt.hashSync(password, 10) ใน Node.js หรือใช้ bcrypt ใน PHP
-- 3. Email จะสร้างจาก username@bmu.local (สามารถแก้ไขได้ภายหลัง)
-- 4. UUID จะสร้างด้วย UUID() function ใน MySQL

-- ตัวอย่างการ hash password ใน Node.js:
-- const bcrypt = require('bcrypt');
-- const password = 'admin123';
-- const hash = bcrypt.hashSync(password, 10);
-- console.log(hash); // $2b$10$...

-- Insert Users (ต้อง hash password ก่อน)
-- Format: INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
--         VALUES (UUID(), 'username', 'email', 'hashed_password', 'employee_id', 'nick_name', 'role', 'name');

-- User 1: admin
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'admin', 'admin@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00010', 'เอ็ม', 'admin', 'ยุทธนา (เอ็ม)');

-- User 2: Ekkacha.A
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Ekkacha.A', 'Ekkacha.A@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'IT00003', 'พี่เอ', 'admin', 'เอกชัย(พี่เอ)');

-- User 3: Panyakorn.plu
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Panyakorn.plu', 'Panyakorn.plu@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00035', 'ซอคเกอร์', 'data_entry', 'ปัญญากร (ซอคเกอร์)');

-- User 4: Suthasinee.pha
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Suthasinee.pha', 'Suthasinee.pha@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'STAC001', 'มิ้น', 'data_entry_and_service', 'สุธาสินี (มิ้น)');

-- User 5: Supaporn.too
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Supaporn.too', 'Supaporn.too@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00016', 'ใบเฟิร์น', 'audit', 'สุภาภรณ์(ใบเฟิร์น)');

-- User 6: TTOP007
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'TTOP007', 'TTOP007@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00008', 'ท็อป', 'audit', 'ธวัชชัย(ท็อป)');

-- User 7: Butsaya.nae
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Butsaya.nae', 'Butsaya.nae@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00044', 'หญิง', 'audit', 'บุษญา(หญิง)');

-- User 8: Sawitree.sri
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Sawitree.sri', 'Sawitree.sri@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00034', 'มาดี', 'service', 'สาวิตรี(มาดี)');

-- User 9: Maythawinee.pim
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Maythawinee.pim', 'Maythawinee.pim@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00036', 'ปิ๋ม', 'data_entry', 'เมธวินี(ปิ๋ม)');

-- User 10: Kanlayanee.pin
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Kanlayanee.pin', 'Kanlayanee.pin@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00037', 'ปิ่น', 'data_entry_and_service', 'กัลยาณี(ปิ่น)');

-- User 11: Natthanicha.bua
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Natthanicha.bua', 'Natthanicha.bua@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00017', 'บัว', 'audit', 'ณัฏฐนิชา(บัว)');

-- User 12: Nitirak.pro
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Nitirak.pro', 'Nitirak.pro@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00038', 'โปร', 'data_entry_and_service', 'นิติรักษ์(โปร)');

-- User 13: Wiranya.wan
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Wiranya.wan', 'Wiranya.wan@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00039', 'วัน', 'data_entry_and_service', 'วิรัญญา(วัน)');

-- User 14: Siriluk.bua
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Siriluk.bua', 'Siriluk.bua@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00018', 'บัว', 'audit', 'ศิริลักษณ์(บัว)');

-- User 15: Chayada.see
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Chayada.see', 'Chayada.see@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00040', 'ซี', 'data_entry_and_service', 'ชยาดา(ซี)');

-- User 16: Kankanis.boo
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Kankanis.boo', 'Kankanis.boo@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00040', 'หมาก', 'service', 'กันต์กนิษฐ์(หมาก)');

-- User 17: Kanokwan.pra
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Kanokwan.pra', 'Kanokwan.pra@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00041', 'ปราณ', 'service', 'กนกวรรณ(ปราณ)');

-- User 18: Sitthikorn.sak
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Sitthikorn.sak', 'Sitthikorn.sak@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00042', 'สัก', 'service', 'สิทธิกร(สัก)');

-- User 19: Kuntida.fua
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Kuntida.fua', 'Kuntida.fua@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00043', 'เฟิร์น', 'service', 'กุนทิดา(เฟิร์น)');

-- User 20: Rachchanon.tre
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Rachchanon.tre', 'Rachchanon.tre@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00045', 'เต้', 'service', 'รัชชนน(เต้)');

-- User 21: Piyawat.pik
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Piyawat.pik', 'Piyawat.pik@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00046', 'พิก', 'service', 'ปิยวัฒน์(พิก)');

-- User 22: supasuta.cha
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'supasuta.cha', 'supasuta.cha@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00047', 'ชา', 'service', 'ศุภสุตา(ชา)');

-- User 23: Pongist.soo
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Pongist.soo', 'Pongist.soo@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00048', 'ซู', 'service', 'พงศ์อิสต์(ซู)');

-- User 24: Supawan.nop
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Supawan.nop', 'Supawan.nop@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00049', 'นพ', 'service', 'ศุภวรรณ(นพ)');

-- User 25: Jirat.poo
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Jirat.poo', 'Jirat.poo@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00050', 'ปู', 'service', 'จิรัฏฐ์(ปู)');

-- User 26: Supacha.nga
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Supacha.nga', 'Supacha.nga@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00051', 'งา', 'service', 'ศุภชา(งา)');

-- User 27: Chanida.san
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Chanida.san', 'Chanida.san@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00052', 'สัน', 'service', 'ชนิฎา(สัน)');

-- User 28: Panatta.kid
INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name) 
VALUES (UUID(), 'Panatta.kid', 'Panatta.kid@bmu.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AC00053', 'คิด', 'service', 'ปนัดดา(คิด)');

-- หมายเหตุ: 
-- 1. Password hash ที่ใช้ในตัวอย่างนี้เป็น hash ของ 'admin123' (ต้องเปลี่ยนเป็น hash ของ password จริง)
-- 2. ต้อง hash password แต่ละรายการด้วย bcrypt ก่อน insert
-- 3. Email สามารถแก้ไขได้ภายหลัง
-- 4. UUID จะถูกสร้างอัตโนมัติด้วย UUID() function
