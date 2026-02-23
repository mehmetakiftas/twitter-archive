import pg from 'pg';
import { poolConfig } from './config.js';

const { Pool } = pg;

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Unexpected database error:', err.message);
});

pool.on('connect', () => {
    if (process.env.DEBUG) {
        console.log('Database connection established');
    }
});

export async function testConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error.message);
        return false;
    }
}

export async function closePool() {
    await pool.end();
}

export async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG) {
        console.log('Executed query', { text, duration, rows: result.rowCount });
    }
    return result;
}

export async function getClient() {
    return await pool.connect();
}

export { pool };
