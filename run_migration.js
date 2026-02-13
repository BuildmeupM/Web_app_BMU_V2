const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

(async () => {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
    });
    try {
        // Add comment_color to users
        await pool.execute(
            `ALTER TABLE users ADD COLUMN comment_color VARCHAR(7) DEFAULT '#2196F3' COMMENT 'สีสำหรับแสดงชื่อผู้เขียนความเห็น (hex)'`
        );
        console.log('✅ Added comment_color to users table');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('⏭️ users.comment_color already exists - skipping.');
        } else {
            console.error('❌ Error (users):', e.message);
        }
    }
    try {
        // Add user_color to registration_task_comments
        await pool.execute(
            `ALTER TABLE registration_task_comments ADD COLUMN user_color VARCHAR(7) DEFAULT '#2196F3' COMMENT 'สีของผู้เขียนตอนที่เขียน (hex)' AFTER user_name`
        );
        console.log('✅ Added user_color to registration_task_comments table');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('⏭️ registration_task_comments.user_color already exists - skipping.');
        } else {
            console.error('❌ Error (comments):', e.message);
        }
    }
    await pool.end();
    console.log('🎉 Migration 052 complete!');
    process.exit(0);
})();
