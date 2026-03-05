import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function fixEnum() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Buildmeup23.04.2022',
    database: process.env.DB_NAME || 'bmu_work_management'
  });

  try {
    console.log('Altering table clients business_type...');
    // Including all frontend options
    await connection.query(`
      ALTER TABLE clients 
      MODIFY COLUMN business_type ENUM(
        'บริษัทจำกัด',
        'บริษัทมหาชนจำกัด',
        'ห้างหุ้นส่วน',
        'ห้างหุ้นส่วนจำกัด',
        'ห้างหุ้นส่วนสามัญนิติบุคคล',
        'มูลนิธิ',
        'สมาคม',
        'กิจการร่วมค้า',
        'อื่น ๆ'
      )
    `);
    console.log('Success business_type!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixEnum();
