import pool from './backend/config/database.js';

async function check() {
  try {
    const [rows] = await pool.execute(`
      SELECT mtd.build, mtd.pnd_sent_for_review_date, mtd.pp30_sent_for_review_date, c.tax_registration_status 
      FROM monthly_tax_data mtd 
      LEFT JOIN clients c ON mtd.build = c.build 
      WHERE mtd.build IN ('326', '205') 
      ORDER BY mtd.updated_at DESC LIMIT 5
    `);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
