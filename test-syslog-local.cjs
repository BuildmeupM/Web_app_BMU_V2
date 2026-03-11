/* eslint-disable */
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

// จำลองข้อความ Log หลายรูปแบบ เหมือน NAS ส่งมาจริงๆ
const messages = [
  '<14>Mar 11 17:30:01 BMU WinFileService Event: read, Path: /AA.โฟลเดอร์หลัก/Build384 บริษัท ทดสอบ จำกัด/บัญชี/ตารางเงินเดือน.xlsx, File/Folder: File, Size: 24.23 KB, User: Baifren, IP: 192.168.1.174',
  '<11>Mar 11 17:30:02 BMU WinFileService Event: delete, Path: /AA.โฟลเดอร์หลัก/Build594/เอกสารเก่า.pdf, File/Folder: File, Size: 165 Bytes, User: Baifren, IP: 192.168.100.15',
  '<14>Mar 11 17:30:03 BMU FileStation Event: mkdir, Path: /A.โฟลเดอร์หลัก/Build077 บริษัท ใหม่ จำกัด, File/Folder: Folder, Size: NA, User: Build077, IP: 118.168.54.189',
  '<10>Mar 11 17:30:04 BMU WinFileService Event: read, Path: /G.BMU marketing/001 BMU/เอกสารสำคัญ.svg, File/Folder: File, Size: 813.62 KB, User: wararat.suk, IP: 192.168.1.181',
  '<14>Mar 11 17:30:05 BMU WinFileService Event: read, Path: /A.โฟลเดอร์หลัก/#recycle/desktop.ini, File/Folder: File, Size: 74 Bytes, User: Baifren, IP: 192.168.100.10',
];

const HOST = '127.0.0.1'; // ส่งเข้าเครื่องตัวเอง
const PORT = 5514;

let index = 0;

function sendNext() {
  if (index >= messages.length) {
    console.log('✅ ส่งครบทุกข้อความแล้ว! ไปดูที่หน้า Dashboard - NAS ได้เลยครับ');
    client.close();
    return;
  }

  const msg = Buffer.from(messages[index]);
  client.send(msg, 0, msg.length, PORT, HOST, (err) => {
    if (err) {
      console.error('❌ Error:', err);
    } else {
      console.log(`📤 [${index + 1}/${messages.length}] ส่งแล้ว: ${messages[index].substring(0, 80)}...`);
    }
    index++;
    setTimeout(sendNext, 1000); // ส่งทีละข้อความ ห่างกัน 1 วินาที
  });
}

console.log(`🚀 เริ่มจำลองส่ง Syslog Log ไปที่ ${HOST}:${PORT} (UDP)...`);
console.log(`📦 จำนวนข้อความทั้งหมด: ${messages.length} ข้อความ\n`);
sendNext();
