import { query } from '../db/connection.js';

export async function exportRoutes(fastify) {
    fastify.get('/export', async (request, reply) => {
        try {
            // Get all tweets with their categories
            const result = await query(`
                SELECT 
                    t.id,
                    t.tweet_url,
                    t.tweet_id,
                    t.author_name,
                    t.author_username,
                    t.tweet_text,
                    t.tweet_created_at,
                    t.added_at,
                    COALESCE(
                        (SELECT json_agg(json_build_object('id', c.id, 'name', c.name))
                         FROM tweet_categories tc
                         JOIN categories c ON tc.category_id = c.id
                         WHERE tc.tweet_id = t.id),
                        '[]'::json
                    ) as categories
                FROM tweets t
                ORDER BY t.tweet_created_at DESC
            `);

            const exportData = {
                exported_at: new Date().toISOString(),
                total_tweets: result.rows.length,
                tweets: result.rows
            };

            reply.header('Content-Type', 'application/json');
            reply.header('Content-Disposition', `attachment; filename="twitter-archive-${new Date().toISOString().split('T')[0]}.json"`);
            return reply.send(exportData);
        } catch (error) {
            console.error('Error exporting tweets:', error.message);
            return reply.status(500).send({
                error: 'Failed to export tweets',
                details: error.message
            });
        }
    });
}
