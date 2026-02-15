import pool from './config/database.js'

async function runMigration() {
    try {
        console.log('Running migration 058: Add linked_task_ids to messenger_routes...')

        await pool.execute(`
            ALTER TABLE messenger_routes
            ADD COLUMN linked_task_ids JSON DEFAULT NULL AFTER notes
        `)

        console.log('✅ Migration 058 completed successfully')
        process.exit(0)
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ Column already exists, skipping...')
            process.exit(0)
        }
        console.error('❌ Migration failed:', error)
        process.exit(1)
    }
}

runMigration()
