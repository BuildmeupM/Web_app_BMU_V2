const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'buildmeupconsultant.direct.quickconnect.to',
    port: 3306,
    user: 'buildmeM',
    password: 'Buildmeup23.04.2022',
    database: 'bmu_work_management'
  });

  // Look for REAL syslog messages (containing typical syslog patterns)
  console.log('=== Looking for REAL NAS syslog messages ===\n');
  
  const [real] = await pool.query(
    "SELECT id, raw_message, event, user, ip FROM nas_syslog WHERE raw_message LIKE '%Event:%' OR raw_message LIKE '%WinFile%' OR raw_message LIKE '%FileStation%' OR raw_message LIKE '%Path:%' ORDER BY id DESC LIMIT 5"
  );
  
  if (real.length > 0) {
    console.log('Found REAL syslog messages:');
    for (const r of real) {
      console.log('---');
      console.log('ID:', r.id);
      console.log('RAW:', r.raw_message);
    }
  } else {
    console.log('No real NAS syslog messages found in DB.');
  }

  // Look for messages containing PRI header <number>
  console.log('\n=== Messages with PRI header <N> ===\n');
  const [pri] = await pool.query(
    "SELECT id, raw_message FROM nas_syslog WHERE raw_message LIKE '<%>%' ORDER BY id DESC LIMIT 5"
  );
  
  if (pri.length > 0) {
    for (const r of pri) {
      console.log('ID:', r.id, '| RAW:', r.raw_message?.substring(0, 200));
    }
  } else {
    console.log('No messages with PRI header found.');
  }

  // Show distinct raw_message patterns (first 50 chars)
  console.log('\n=== Distinct message patterns (first 80 chars) ===\n');
  const [patterns] = await pool.query(
    "SELECT DISTINCT LEFT(raw_message, 80) as pattern, COUNT(*) as cnt FROM nas_syslog GROUP BY LEFT(raw_message, 80) ORDER BY cnt DESC LIMIT 20"
  );
  for (const p of patterns) {
    console.log(`[${p.cnt}x]`, p.pattern);
  }

  await pool.end();
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
