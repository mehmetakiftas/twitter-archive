import pg from 'pg';
import { dbConfig } from '../config.js';

const { Pool } = pg;

async function seedCategories() {
    const pool = new Pool(dbConfig);

    try {
        console.log('Seeding default categories...');

        for (const name of defaultCategories) {
            await pool.query(
                `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
                [name]
            );
        }

        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        console.log('\nCategories in database:');
        result.rows.forEach(cat => {
            console.log(`  - ${cat.name}`);
        });

        console.log('\nSeeding completed!');
    } catch (error) {
        console.error('Error seeding categories:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seedCategories();
