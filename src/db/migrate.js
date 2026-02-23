import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import { dbConfig } from './config.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
    const pool = new Pool(dbConfig);

    try {
        console.log('Running migrations...');
        
        const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
        const sql = readFileSync(migrationPath, 'utf8');
        
        await pool.query(sql);
        
        console.log('Migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
