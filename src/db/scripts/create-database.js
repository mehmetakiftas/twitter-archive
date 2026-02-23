import pg from 'pg';
import { dbConfig, dbName } from '../config.js';

const { Client } = pg;

async function createDatabase() {
    const client = new Client({
        ...dbConfig,
        database: 'postgres'
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL...');

        const result = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (result.rows.length > 0) {
            console.log(`Database "${dbName}" already exists.`);
        } else {
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`Database "${dbName}" created successfully!`);
        }
    } catch (error) {
        console.error('Error creating database:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createDatabase();
