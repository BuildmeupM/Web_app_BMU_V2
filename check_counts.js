import dotenv from 'dotenv';
dotenv.config();
import pool from './backend/config/database.js';

async function run() {
  const [rows] = await pool.execute(`
    SELECT 
      dew.build, 
      c.company_name, 
      dew.work_year, 
      dew.work_month,
      dew.entry_timestamp,
      dew.submission_count
    FROM document_entry_work dew
    LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
    WHERE dew.deleted_at IS NULL
    ORDER BY dew.entry_timestamp DESC
    LIMIT 100
  `);
  
  // Group by build to find counts
  const counts = rows.reduce((acc, row) => {
    acc[row.build] = (acc[row.build] || 0) + 1;
    return acc;
  }, {});
  
  const multis = Object.keys(counts).filter(b => counts[b] > 1);
  console.log('Builds with multiple entries (in the last 100 entries):');
  multis.forEach(b => {
    console.log(`- Build: ${b}, Count: ${counts[b]}`);
    rows.filter(r => r.build === b).forEach(r => {
      console.log(`  > Timestamp: ${r.entry_timestamp}, Submissions: ${r.submission_count}`);
    });
  });
  
  process.exit(0);
}

run().catch(console.error);
