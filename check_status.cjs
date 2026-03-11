const mysql = require('mysql2/promise');
const dgram = require('dgram');

(async () => {
  console.log('=== NAS Syslog System Status Check ===\n');

  // 1. Check DB Connection
  try {
    const pool = mysql.createPool({
      host: 'buildmeupconsultant.direct.quickconnect.to',
      port: 3306,
      user: 'buildmeM',
      password: 'Buildmeup23.04.2022',
      database: 'bmu_work_management'
    });
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM nas_syslog');
    console.log('1. DB Connection:     ✅ OK');
    console.log('   nas_syslog rows:   ' + rows[0].count);
    
    // Check table structure
    const [cols] = await pool.query('DESCRIBE nas_syslog');
    console.log('   Table columns:     ' + cols.map(c => c.Field).join(', '));
    
    await pool.end();
  } catch (e) {
    console.log('1. DB Connection:     ❌ FAILED - ' + e.message);
  }

  // 2. Check UDP port 5514
  console.log('');
  try {
    const client = dgram.createSocket('udp4');
    const testMsg = '<14>Mar 11 21:50:00 BMU WinFileService Event: write, Path: /test/status-check.txt, File/Folder: File, Size: 100 B, User: SystemCheck, IP: 127.0.0.1';
    
    await new Promise((resolve, reject) => {
      client.send(testMsg, 5514, '127.0.0.1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('2. UDP Port 5514:     ✅ Test message sent');
    console.log('   Message:            write event by SystemCheck');
    client.close();
  } catch (e) {
    console.log('2. UDP Port 5514:     ❌ FAILED - ' + e.message);
  }

  // 3. Check backend API
  console.log('');
  try {
    const res = await fetch('http://localhost:3001/health');
    const json = await res.json();
    console.log('3. Backend API:       ' + (json.success ? '✅ OK' : '❌ FAILED'));
  } catch (e) {
    console.log('3. Backend API:       ❌ FAILED - ' + e.message);
  }

  // 4. Check NAS Syslog API
  try {
    const res = await fetch('http://localhost:3001/api/nas-syslog?limit=1');
    const json = await res.json();
    console.log('4. NAS Syslog API:    ' + (json.success ? '✅ OK' : '❌ FAILED'));
    if (json.pagination) {
      console.log('   Total records:     ' + json.pagination.total);
    }
  } catch (e) {
    console.log('4. NAS Syslog API:    ❌ FAILED - ' + e.message);
  }

  console.log('\n=== Check Complete ===');
})();
