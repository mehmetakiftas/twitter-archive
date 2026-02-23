import pg from 'pg';
import { dbConfig } from '../config.js';

const { Pool } = pg;

async function checkConnection() {
    console.log('Database Configuration:');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
    console.log('');

    const pool = new Pool(dbConfig);

    try {
        console.log('Testing connection...');
        const client = await pool.connect();
        
        const result = await client.query('SELECT NOW() as current_time, current_database() as database');
        console.log(`Connected successfully!`);
        console.log(`  Server time: ${result.rows[0].current_time}`);
        console.log(`  Database: ${result.rows[0].database}`);

        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('\nTables in database:');
        if (tables.rows.length === 0) {
            console.log('  (no tables found - run migrations first)');
        } else {
            tables.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        }

        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM tweets) as tweets,
                (SELECT COUNT(*) FROM categories) as categories,
                (SELECT COUNT(*) FROM tweet_categories) as tweet_categories
        `).catch(() => ({ rows: [{ tweets: 0, categories: 0, tweet_categories: 0 }] }));

        if (counts.rows[0]) {
            console.log('\nRecord counts:');
            console.log(`  Tweets: ${counts.rows[0].tweets}`);
            console.log(`  Categories: ${counts.rows[0].categories}`);
            console.log(`  Tweet-Category links: ${counts.rows[0].tweet_categories}`);
        }

        client.release();
    } catch (error) {
        console.error('Connection failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

checkConnection();
