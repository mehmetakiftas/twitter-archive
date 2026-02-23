import { query, getClient } from '../db/connection.js';
import { decodeSnowflake, parseTweetId, parseAuthorUsername } from '../utils/snowflake.js';

async function fetchOEmbed(tweetUrl) {
    // Validate URL is from twitter.com or x.com
    try {
        const url = new URL(tweetUrl);
        if (!['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com'].includes(url.hostname)) {
            throw new Error('URL must be from twitter.com or x.com');
        }
    } catch (error) {
        throw new Error('Invalid tweet URL');
    }
    
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
    
    // Add 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const response = await fetch(oembedUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch oEmbed: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - Twitter API took too long to respond');
        }
        throw error;
    }
}

function extractTweetText(html) {
    let text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
    
    const dashIndex = text.lastIndexOf('—');
    if (dashIndex !== -1) {
        text = text.substring(0, dashIndex).trim();
    }
    
    return text;
}

export async function tweetsRoutes(fastify) {
    fastify.post('/tweets', async (request, reply) => {
        const { tweet_url, category_ids, force_add } = request.body;
        
        if (!tweet_url) {
            return reply.status(400).send({ error: 'tweet_url is required' });
        }
        
        const tweetId = parseTweetId(tweet_url);
        if (!tweetId) {
            return reply.status(400).send({ error: 'Invalid tweet URL format' });
        }
        
        if (category_ids && !Array.isArray(category_ids)) {
            return reply.status(400).send({ error: 'category_ids must be an array' });
        }
        
        try {
            const existingResult = await query(
                'SELECT id, tweet_url FROM tweets WHERE tweet_id = $1',
                [tweetId]
            );
            
            if (existingResult.rows.length > 0) {
                const existingTweet = existingResult.rows[0];
                
                if (force_add && category_ids && category_ids.length > 0) {
                    const client = await getClient();
                    try {
                        await client.query('BEGIN');
                        
                        const values = category_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
                        const params = [existingTweet.id, ...category_ids];
                        
                        await client.query(
                            `INSERT INTO tweet_categories (tweet_id, category_id)
                             VALUES ${values}
                             ON CONFLICT DO NOTHING`,
                            params
                        );
                        
                        await client.query('COMMIT');
                        return reply.send({
                            message: 'Tweet already exists. Categories updated.',
                            tweet_id: existingTweet.id,
                            existed: true
                        });
                    } catch (error) {
                        await client.query('ROLLBACK');
                        throw error;
                    } finally {
                        client.release();
                    }
                }
                
                return reply.status(409).send({
                    error: 'Tweet already exists',
                    message: 'Tweet already exists. Add to categories?',
                    existing_tweet_id: existingTweet.id,
                    existed: true
                });
            }
            
            let oembedData;
            try {
                oembedData = await fetchOEmbed(tweet_url);
            } catch (error) {
                return reply.status(400).send({ 
                    error: 'Failed to fetch tweet embed',
                    details: error.message 
                });
            }
            
            const tweetText = extractTweetText(oembedData.html);
            const tweetCreatedAt = decodeSnowflake(tweetId);
            const authorUsername = parseAuthorUsername(tweet_url) || oembedData.author_name;
            
            const client = await getClient();
            try {
                await client.query('BEGIN');
                
                const result = await client.query(
                    `INSERT INTO tweets (tweet_url, tweet_id, author_name, author_username, tweet_text, embed_html, tweet_created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING *`,
                    [
                        tweet_url,
                        tweetId,
                        oembedData.author_name,
                        authorUsername,
                        tweetText,
                        oembedData.html,
                        tweetCreatedAt
                    ]
                );
                
                const newTweet = result.rows[0];
                
                if (category_ids && category_ids.length > 0) {
                    const values = category_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
                    const params = [newTweet.id, ...category_ids];
                    
                    await client.query(
                        `INSERT INTO tweet_categories (tweet_id, category_id)
                         VALUES ${values}
                         ON CONFLICT DO NOTHING`,
                        params
                    );
                }
                
                await client.query('COMMIT');
                
                return reply.status(201).send({
                    message: 'Tweet archived successfully',
                    tweet: newTweet
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error in POST /tweets:', error.message);
            return reply.status(500).send({
                error: 'Failed to archive tweet',
                details: error.message
            });
        }
    });

    fastify.get('/tweets', async (request, reply) => {
        try {
            const { 
                category_id, 
                start_date, 
                end_date, 
                search,
                limit = 20, 
                offset = 0 
            } = request.query;
            
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            
            if (category_id) {
                conditions.push(`t.id IN (SELECT tweet_id FROM tweet_categories WHERE category_id = $${paramIndex})`);
                params.push(category_id);
                paramIndex++;
            }
            
            if (start_date) {
                conditions.push(`t.tweet_created_at >= $${paramIndex}::timestamptz`);
                params.push(start_date);
                paramIndex++;
            }
            
            if (end_date) {
                conditions.push(`t.tweet_created_at <= $${paramIndex}::timestamptz`);
                params.push(end_date);
                paramIndex++;
            }
            
            if (search) {
                conditions.push(`t.tweet_text ILIKE $${paramIndex}`);
                params.push(`%${search}%`);
                paramIndex++;
            }
            
            const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
            
            const sql = `
                SELECT t.*, 
                       COALESCE(
                           (SELECT json_agg(json_build_object('id', c.id, 'name', c.name))
                            FROM tweet_categories tc
                            JOIN categories c ON tc.category_id = c.id
                            WHERE tc.tweet_id = t.id),
                           '[]'::json
                       ) as categories
                FROM tweets t
                ${whereClause}
                ORDER BY t.tweet_created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            params.push(parseInt(limit), parseInt(offset));
            
            const result = await query(sql, params);
            
            const countParams = params.slice(0, -2);
            const countSql = `SELECT COUNT(*) as total FROM tweets t ${whereClause}`;
            const countResult = await query(countSql, countParams);
            
            return reply.send({
                tweets: result.rows || [],
                total: parseInt(countResult.rows[0]?.total || 0),
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Failed to load tweets',
                tweets: [],
                total: 0
            });
        }
    });

    fastify.delete('/tweets/:id', async (request, reply) => {
        const { id } = request.params;
        
        try {
            const result = await query(
                'DELETE FROM tweets WHERE id = $1 RETURNING id',
                [id]
            );
            
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Tweet not found' });
            }
            
            return reply.send({ message: 'Tweet deleted successfully' });
        } catch (error) {
            console.error('Error deleting tweet:', error.message);
            return reply.status(500).send({
                error: 'Failed to delete tweet',
                details: error.message
            });
        }
    });

    fastify.post('/tweets/:id/categories', async (request, reply) => {
        const { id } = request.params;
        const { category_ids } = request.body;
        
        if (!category_ids || !Array.isArray(category_ids)) {
            return reply.status(400).send({ error: 'category_ids array is required' });
        }
        
        try {
            const tweetExists = await query('SELECT id FROM tweets WHERE id = $1', [id]);
            if (tweetExists.rows.length === 0) {
                return reply.status(404).send({ error: 'Tweet not found' });
            }
            
            const client = await getClient();
            try {
                await client.query('BEGIN');
                
                await client.query('DELETE FROM tweet_categories WHERE tweet_id = $1', [id]);
                
                if (category_ids.length > 0) {
                    const values = category_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
                    const params = [id, ...category_ids];
                    
                    await client.query(
                        `INSERT INTO tweet_categories (tweet_id, category_id)
                         VALUES ${values}
                         ON CONFLICT DO NOTHING`,
                        params
                    );
                }
                
                await client.query('COMMIT');
                return reply.send({ message: 'Categories updated successfully' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error updating categories:', error.message);
            return reply.status(500).send({
                error: 'Failed to update categories',
                details: error.message
            });
        }
    });
}
