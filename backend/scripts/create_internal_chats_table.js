import pool from '../config/database.js';

async function createTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS internal_client_chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        build VARCHAR(255) NOT NULL,
        sender_employee_id VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        reply_to_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reply_to_id) REFERENCES internal_client_chats(id) ON DELETE SET NULL,
        INDEX idx_build (build)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(query);
    console.log('internal_client_chats table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

createTable();
