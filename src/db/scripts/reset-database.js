import pg from 'pg';
import readline from 'readline';
import { dbConfig, dbName } from '../config.js';

const { Pool } = pg;

async function resetDatabase() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = await new Promise(resolve => {
        rl.question(`Are you sure you want to reset database "${dbName}"? This will delete ALL data! (yes/no): `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        process.exit(0);
    }

    const pool = new Pool(dbConfig);

    try {
        console.log('Dropping all tables...');
        
        await pool.query(`
            DROP TABLE IF EXISTS tweet_categories CASCADE;
            DROP TABLE IF EXISTS tweets CASCADE;
            DROP TABLE IF EXISTS categories CASCADE;
        `);

        console.log('Recreating tables...');

        await pool.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

            CREATE TABLE IF NOT EXISTS tweets (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tweet_url TEXT UNIQUE NOT NULL,
                tweet_id TEXT UNIQUE NOT NULL,
                author_name TEXT,
                author_username TEXT,
                tweet_text TEXT,
                embed_html TEXT,
                tweet_created_at TIMESTAMPTZ,
                added_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tweet_categories (
                tweet_id UUID REFERENCES tweets(id) ON DELETE CASCADE,
                category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
                PRIMARY KEY (tweet_id, category_id)
            );

            CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(tweet_created_at);
            CREATE INDEX IF NOT EXISTS idx_tweets_text ON tweets USING gin(to_tsvector('simple', tweet_text));
            CREATE INDEX IF NOT EXISTS idx_tweets_added_at ON tweets(added_at);
        `);

        console.log('Database reset successfully!');
    } catch (error) {
        console.error('Error resetting database:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

resetDatabase();
