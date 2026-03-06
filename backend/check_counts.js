import dotenv from 'dotenv';
dotenv.config();
import pool from './config/database.js';

async function run() {
  const [rows] = await pool.execute(`
    SELECT dew.id, dew.build, c.company_name, dew.work_year, dew.work_month, dew.entry_timestamp, dew.submission_count 
    FROM document_entry_work dew
    LEFT JOIN clients c ON dew.build = c.build AND c.deleted_at IS NULL
    LEFT JOIN monthly_tax_data mtd ON dew.build = mtd.build AND dew.work_year = mtd.tax_year AND dew.work_month = mtd.tax_month AND mtd.deleted_at IS NULL
    WHERE dew.deleted_at IS NULL
    AND dew.work_year = '2026' AND dew.work_month = '2'
    ORDER BY dew.entry_timestamp DESC
  `);
  
  // Group by build to find counts
  const counts = rows.reduce((acc, row) => {
    // Only group by year and month as well to see if there are duplicates for the SAME month
    const key = `${row.build}_${row.work_year}_${row.work_month}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  const multis = Object.keys(counts).filter(b => counts[b] > 1);
  console.log('Builds with multiple entries (in the last 200 entries):');
  multis.forEach(key => {
    const [b, y, m] = key.split('_');
    console.log(`- Build: ${b} (${y}-${m}), Count: ${counts[key]}`);
    rows.filter(r => r.build === b && r.work_year == y && r.work_month == m).forEach(r => {
      console.log(`  > Timestamp: ${r.entry_timestamp}, Submissions: ${r.submission_count}`);
    });
  });
  
  process.exit(0);
}

run().catch(console.error);
