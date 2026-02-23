import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { tweetsRoutes } from './routes/tweets.js';
import { categoriesRoutes } from './routes/categories.js';
import { statsRoutes } from './routes/stats.js';
import { calendarRoutes } from './routes/calendar.js';
import { exportRoutes } from './routes/export.js';
import { testConnection, closePool } from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
    logger: false
});

await fastify.register(cors, {
    origin: true
});

await fastify.register(compress, {
    global: true
});

await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (req, context) => {
        return {
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`
        };
    }
});

await fastify.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/',
    setHeaders: (res, path) => {
        if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
});

await fastify.register(tweetsRoutes);
await fastify.register(categoriesRoutes);
await fastify.register(statsRoutes);
await fastify.register(calendarRoutes);
await fastify.register(exportRoutes);

fastify.get('/health', async () => {
    const dbHealthy = await testConnection();
    return {
        status: dbHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbHealthy ? 'connected' : 'disconnected'
    };
});

const start = async () => {
    try {
        const dbHealthy = await testConnection();
        if (!dbHealthy) {
            console.error('Failed to connect to database. Please check your configuration.');
            process.exit(1);
        }
        console.log('Database connection verified.');

        const port = process.env.PORT || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server running at http://localhost:${port}`);
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
};

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    try {
        await fastify.close();
        await closePool();
        console.log('Server closed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err.message);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
