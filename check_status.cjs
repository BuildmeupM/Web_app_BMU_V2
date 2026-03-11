const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'buildmeupconsultant.direct.quickconnect.to',
    port: 3306,
    user: 'buildmeM',
    password: 'Buildmeup23.04.2022',
    database: 'bmu_work_management'
  });

  // Show before
  console.log('=== Before Fix ===');
  const [before] = await pool.query(
    'SELECT id, timestamp, created_at FROM nas_syslog ORDER BY id LIMIT 5'
  );
  for (const r of before) {
    console.log(`ID ${r.id}: timestamp=${r.timestamp}, created_at=${r.created_at}`);
  }

  // Fix: subtract 7 hours from timestamp where it's ahead of created_at by ~7h
  // This fixes records stored by Railway (UTC) without timezone adjustment
  const [result] = await pool.query(
    `UPDATE nas_syslog 
     SET timestamp = DATE_SUB(timestamp, INTERVAL 7 HOUR) 
     WHERE TIMESTAMPDIFF(HOUR, created_at, timestamp) >= 5`
  );
  console.log(`\nFixed ${result.affectedRows} records (subtracted 7 hours)`);

  // Show after
  console.log('\n=== After Fix ===');
  const [after] = await pool.query(
    'SELECT id, timestamp, created_at FROM nas_syslog ORDER BY id LIMIT 5'
  );
  for (const r of after) {
    console.log(`ID ${r.id}: timestamp=${r.timestamp}, created_at=${r.created_at}`);
  }

  await pool.end();
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
