import pg from 'pg';
import { dbConfig, dbName } from '../config.js';

const { Client, Pool } = pg;


async function setup() {
    console.log('=== Twitter Archive - Database Setup ===\n');

    // Step 1: Create database
    console.log('Step 1: Creating database...');
    const client = new Client({
        ...dbConfig,
        database: 'postgres'
    });

    try {
        await client.connect();

        const result = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (result.rows.length > 0) {
            console.log(`  Database "${dbName}" already exists.`);
        } else {
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`  Database "${dbName}" created!`);
        }
    } catch (error) {
        console.error('  Error creating database:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }

    // Step 2: Run migrations
    console.log('\nStep 2: Running migrations...');
    const pool = new Pool(dbConfig);

    try {
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
        console.log('  Tables created!');

        console.log('\n=== Setup Complete! ===');
        console.log(`  Database: ${dbName}`);
        console.log('\nRun "npm run dev" to start the server.');

    } catch (error) {
        console.error('  Error during setup:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setup();
