import { query } from '../db/connection.js';

export async function categoriesRoutes(fastify) {
    fastify.post('/categories', async (request, reply) => {
        const { name } = request.body;
        
        if (!name || !name.trim()) {
            return reply.status(400).send({ error: 'Category name is required' });
        }
        
        try {
            const result = await query(
                'INSERT INTO categories (name) VALUES ($1) RETURNING *',
                [name.trim()]
            );
            
            return reply.status(201).send(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') {
                return reply.status(409).send({ error: 'Category already exists' });
            }
            throw error;
        }
    });

    fastify.get('/categories', async (request, reply) => {
        try {
            const result = await query(`
                SELECT c.*, COUNT(tc.tweet_id) as tweet_count
                FROM categories c
                LEFT JOIN tweet_categories tc ON c.id = tc.category_id
                GROUP BY c.id
                ORDER BY c.name ASC
            `);
            
            return reply.send(result.rows);
        } catch (error) {
            console.error('Error fetching categories:', error.message);
            return reply.status(500).send({
                error: 'Failed to load categories',
                details: error.message
            });
        }
    });

    fastify.patch('/categories/:id', async (request, reply) => {
        const { id } = request.params;
        const { name } = request.body;
        
        if (!name || !name.trim()) {
            return reply.status(400).send({ error: 'Category name is required' });
        }
        
        try {
            const result = await query(
                'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
                [name.trim(), id]
            );
            
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Category not found' });
            }
            
            return reply.send(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') {
                return reply.status(409).send({ error: 'Category name already exists' });
            }
            console.error('Error updating category:', error.message);
            return reply.status(500).send({
                error: 'Failed to update category',
                details: error.message
            });
        }
    });

    fastify.delete('/categories/:id', async (request, reply) => {
        const { id } = request.params;
        
        try {
            const result = await query(
                'DELETE FROM categories WHERE id = $1 RETURNING id',
                [id]
            );
            
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Category not found' });
            }
            
            return reply.send({ message: 'Category deleted successfully' });
        } catch (error) {
            console.error('Error deleting category:', error.message);
            return reply.status(500).send({
                error: 'Failed to delete category',
                details: error.message
            });
        }
    });
}
