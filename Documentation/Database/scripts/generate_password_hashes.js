/**
 * Script สำหรับ Generate Password Hashes สำหรับ Insert Users
 * Usage: node generate_password_hashes.js
 * 
 * ไฟล์นี้จะสร้าง password hashes สำหรับ users ทั้งหมด
 * และสร้าง SQL INSERT statements พร้อม password hashes ที่ถูกต้อง
 */

import bcrypt from 'bcrypt';

// ข้อมูล Users จากภาพประกอบที่ 2
const users = [
  { username: 'admin', password: 'admin123', employee_id: 'AC00010', nick_name: 'เอ็ม', role: 'admin', name: 'ยุทธนา (เอ็ม)' },
  { username: 'Ekkacha.A', password: '#BMU.adminA', employee_id: 'IT00003', nick_name: 'พี่เอ', role: 'admin', name: 'เอกชัย(พี่เอ)' },
  { username: 'Panyakorn.plu', password: '#BMU.1136', employee_id: 'AC00035', nick_name: 'ซอคเกอร์', role: 'data_entry', name: 'ปัญญากร (ซอคเกอร์)' },
  { username: 'Suthasinee.pha', password: '#BMU.1744', employee_id: 'STAC001', nick_name: 'มิ้น', role: 'data_entry_and_service', name: 'สุธาสินี (มิ้น)' },
  { username: 'Supaporn.too', password: '#BMU.1744', employee_id: 'AC00016', nick_name: 'ใบเฟิร์น', role: 'audit', name: 'สุภาภรณ์(ใบเฟิร์น)' },
  { username: 'TTOP007', password: '#BMU.1108', employee_id: 'AC00008', nick_name: 'ท็อป', role: 'audit', name: 'ธวัชชัย(ท็อป)' },
  { username: 'Butsaya.nae', password: '#BMU.1195', employee_id: 'AC00044', nick_name: 'หญิง', role: 'audit', name: 'บุษญา(หญิง)' },
  { username: 'Sawitree.sri', password: '#BMU.2931', employee_id: 'AC00034', nick_name: 'มาดี', role: 'service', name: 'สาวิตรี(มาดี)' },
  { username: 'Maythawinee.pim', password: '#BMU.1136', employee_id: 'AC00036', nick_name: 'ปิ๋ม', role: 'data_entry', name: 'เมธวินี(ปิ๋ม)' },
  { username: 'Kanlayanee.pin', password: '#BMU.1744', employee_id: 'AC00037', nick_name: 'ปิ่น', role: 'data_entry_and_service', name: 'กัลยาณี(ปิ่น)' },
  { username: 'Natthanicha.bua', password: '#BMU.1744', employee_id: 'AC00017', nick_name: 'บัว', role: 'audit', name: 'ณัฏฐนิชา(บัว)' },
  { username: 'Nitirak.pro', password: '#BMU.1744', employee_id: 'AC00038', nick_name: 'โปร', role: 'data_entry_and_service', name: 'นิติรักษ์(โปร)' },
  { username: 'Wiranya.wan', password: '#BMU.1744', employee_id: 'AC00039', nick_name: 'วัน', role: 'data_entry_and_service', name: 'วิรัญญา(วัน)' },
  { username: 'Siriluk.bua', password: '#BMU.1744', employee_id: 'AC00018', nick_name: 'บัว', role: 'audit', name: 'ศิริลักษณ์(บัว)' },
  { username: 'Chayada.see', password: '#BMU.1744', employee_id: 'AC00040', nick_name: 'ซี', role: 'data_entry_and_service', name: 'ชยาดา(ซี)' },
  { username: 'Kankanis.boo', password: '#BMU.2445', employee_id: 'AC00040', nick_name: 'หมาก', role: 'service', name: 'กันต์กนิษฐ์(หมาก)' },
  { username: 'Kanokwan.pra', password: '#BMU.2445', employee_id: 'AC00041', nick_name: 'ปราณ', role: 'service', name: 'กนกวรรณ(ปราณ)' },
  { username: 'Sitthikorn.sak', password: '#BMU.2445', employee_id: 'AC00042', nick_name: 'สัก', role: 'service', name: 'สิทธิกร(สัก)' },
  { username: 'Kuntida.fua', password: '#BMU.2445', employee_id: 'AC00043', nick_name: 'เฟิร์น', role: 'service', name: 'กุนทิดา(เฟิร์น)' },
  { username: 'Rachchanon.tre', password: '#BMU.2445', employee_id: 'AC00045', nick_name: 'เต้', role: 'service', name: 'รัชชนน(เต้)' },
  { username: 'Piyawat.pik', password: '#BMU.2445', employee_id: 'AC00046', nick_name: 'พิก', role: 'service', name: 'ปิยวัฒน์(พิก)' },
  { username: 'supasuta.cha', password: '#BMU.2445', employee_id: 'AC00047', nick_name: 'ชา', role: 'service', name: 'ศุภสุตา(ชา)' },
  { username: 'Pongist.soo', password: '#BMU.2445', employee_id: 'AC00048', nick_name: 'ซู', role: 'service', name: 'พงศ์อิสต์(ซู)' },
  { username: 'Supawan.nop', password: '#BMU.2445', employee_id: 'AC00049', nick_name: 'นพ', role: 'service', name: 'ศุภวรรณ(นพ)' },
  { username: 'Jirat.poo', password: '#BMU.2445', employee_id: 'AC00050', nick_name: 'ปู', role: 'service', name: 'จิรัฏฐ์(ปู)' },
  { username: 'Supacha.nga', password: '#BMU.2445', employee_id: 'AC00051', nick_name: 'งา', role: 'service', name: 'ศุภชา(งา)' },
  { username: 'Chanida.san', password: '#BMU.2445', employee_id: 'AC00052', nick_name: 'สัน', role: 'service', name: 'ชนิฎา(สัน)' },
  { username: 'Panatta.kid', password: '#BMU.2445', employee_id: 'AC00053', nick_name: 'คิด', role: 'service', name: 'ปนัดดา(คิด)' },
];

// Generate password hashes และสร้าง SQL INSERT statements
console.log('-- Generated SQL INSERT statements with bcrypt password hashes\n');
console.log('-- Run this script first: node generate_password_hashes.js\n');
console.log('-- Then copy the output SQL statements to insert into database\n\n');

users.forEach((user, index) => {
  const hash = bcrypt.hashSync(user.password, 10);
  const email = `${user.username}@bmu.local`;
  
  console.log(`-- User ${index + 1}: ${user.username}`);
  console.log(`INSERT INTO users (id, username, email, password_hash, employee_id, nick_name, role, name)`);
  console.log(`VALUES (UUID(), '${user.username}', '${email}', '${hash}', '${user.employee_id}', '${user.nick_name}', '${user.role}', '${user.name}');`);
  console.log('');
});

console.log('-- Total users:', users.length);
