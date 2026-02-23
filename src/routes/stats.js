import { query } from '../db/connection.js';

export async function statsRoutes(fastify) {
    fastify.get('/stats', async (request, reply) => {
        try {
            const totalResult = await query('SELECT COUNT(*) as total FROM tweets');
            const totalTweetCount = parseInt(totalResult.rows[0].total);

            const categoryResult = await query(`
                SELECT c.id, c.name, COUNT(tc.tweet_id) as count
                FROM categories c
                LEFT JOIN tweet_categories tc ON c.id = tc.category_id
                GROUP BY c.id, c.name
                ORDER BY count DESC
            `);

            const timezone = process.env.TZ || 'Europe/Istanbul';
            const mostActiveResult = await query(`
                WITH daily_counts AS (
                    SELECT 
                        DATE(tweet_created_at AT TIME ZONE $1) as day,
                        COUNT(*) as count
                    FROM tweets
                    WHERE tweet_created_at IS NOT NULL
                    GROUP BY DATE(tweet_created_at AT TIME ZONE $1)
                ),
                max_count AS (
                    SELECT MAX(count) as max_count FROM daily_counts
                )
                SELECT dc.day, dc.count
                FROM daily_counts dc, max_count mc
                WHERE dc.count = mc.max_count
                ORDER BY dc.day DESC
            `, [timezone]);

            return reply.send({
                totalTweetCount,
                categoryCounts: categoryResult.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    count: parseInt(row.count)
                })),
                mostActiveDays: mostActiveResult.rows.map(row => ({
                    date: row.day,
                    count: parseInt(row.count)
                }))
            });
        } catch (error) {
            console.error('Error fetching stats:', error.message);
            return reply.status(500).send({
                error: 'Failed to load stats',
                details: error.message
            });
        }
    });
}
