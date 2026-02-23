import { query } from '../db/connection.js';

export async function calendarRoutes(fastify) {
    fastify.get('/calendar', async (request, reply) => {
        const { year, month } = request.query;
        
        if (!year || !month) {
            return reply.status(400).send({ error: 'year and month are required' });
        }
        
        try {
            const timezone = process.env.TZ || 'Europe/Istanbul';
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
            const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
            const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
            
            const result = await query(`
                SELECT 
                    TO_CHAR(tweet_created_at AT TIME ZONE $3, 'YYYY-MM-DD') as date,
                    COUNT(*) as count
                FROM tweets
                WHERE tweet_created_at >= $1::date
                  AND tweet_created_at < $2::date
                GROUP BY TO_CHAR(tweet_created_at AT TIME ZONE $3, 'YYYY-MM-DD')
                ORDER BY date
            `, [startDate, endDate, timezone]);
            
            return reply.send(result.rows.map(row => ({
                date: row.date,
                count: parseInt(row.count)
            })));
        } catch (error) {
            console.error('Error fetching calendar:', error.message);
            return reply.status(500).send({
                error: 'Failed to load calendar',
                details: error.message
            });
        }
    });

    fastify.get('/calendar/day', async (request, reply) => {
        const { date } = request.query;
        
        if (!date) {
            return reply.status(400).send({ error: 'date is required (YYYY-MM-DD format)' });
        }
        
        try {
            const timezone = process.env.TZ || 'Europe/Istanbul';
            const result = await query(`
                SELECT 
                    id,
                    tweet_url,
                    tweet_id,
                    author_username,
                    LEFT(tweet_text, 200) as tweet_text_truncated,
                    tweet_text,
                    tweet_created_at
                FROM tweets
                WHERE DATE(tweet_created_at AT TIME ZONE $2) = $1::date
                ORDER BY tweet_created_at DESC
            `, [date, timezone]);
            
            return reply.send(result.rows);
        } catch (error) {
            console.error('Error fetching day tweets:', error.message);
            return reply.status(500).send({
                error: 'Failed to load tweets for this day',
                details: error.message
            });
        }
    });
}
