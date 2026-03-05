import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bmu_db'
    });

    const [rows] = await connection.execute('SELECT employee_id, position FROM employees LIMIT 10;');
    console.log(rows);
    
    const [users] = await connection.execute('SELECT employee_id, role FROM users LIMIT 10;');
    console.log(users);
    
    await connection.end();
  } catch(e) {
    console.error(e);
  }
}

test();
