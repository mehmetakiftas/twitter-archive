import pg from 'pg';
import readline from 'readline';
import { dbConfig, dbName } from '../config.js';

const { Client } = pg;

async function dropDatabase() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = await new Promise(resolve => {
        rl.question(`Are you sure you want to drop database "${dbName}"? This will delete ALL data! (yes/no): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        process.exit(0);
    }

    const client = new Client({
        ...dbConfig,
        database: 'postgres'
    });

    try {
        await client.connect();

        await client.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = $1
            AND pid <> pg_backend_pid()
        `, [dbName]);

        await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
        console.log(`Database "${dbName}" dropped successfully!`);
    } catch (error) {
        console.error('Error dropping database:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

dropDatabase();
