const sqlite3 = require('sqlite3').verbose();

// Path to the NAS sqlite database
const dbPath = 'V:\\Lognas\\SYNOSYSLOGDB__LOCALARCH.DB';

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');

    // Query to get all table names
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            throw err;
        }
        console.log('Tables:', tables);

        // For each table, get the schema
        tables.forEach(table => {
            db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
                if (err) {
                    throw err;
                }
                console.log(`Schema for table ${table.name}:`, columns.map(c => `${c.name} (${c.type})`));
                
                // Get one row as sample
                db.get(`SELECT * FROM ${table.name} LIMIT 1`, [], (err, row) => {
                     console.log(`Sample row from ${table.name}:`, row);
                     console.log('-----------------------------------');
                });
            });
        });
    });
});
