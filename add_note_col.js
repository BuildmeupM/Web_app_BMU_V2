import pool from './backend/config/database.js';

async function run() {
  try {
    await pool.execute('ALTER TABLE clients ADD COLUMN note TEXT NULL;');
    console.log('Successfully added note column');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column note already exists');
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}
run();
