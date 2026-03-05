import pool from './backend/config/database.js';

async function run() {
  try {
    const [rows] = await pool.execute(`
      SELECT build, company_name, establishment_date, business_category, company_size, tax_registration_status, province, district, subdistrict, postal_code, updated_at
      FROM clients
      WHERE deleted_at IS NULL
        AND company_status != 'ยกเลิกทำ'
        AND (
          establishment_date IS NULL OR business_category IS NULL OR business_category = '' OR company_size IS NULL OR company_size = ''
          OR tax_registration_status IS NULL OR tax_registration_status = ''
          OR province IS NULL OR province = '' OR district IS NULL OR district = '' OR subdistrict IS NULL OR subdistrict = '' OR postal_code IS NULL OR postal_code = ''
        )
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
