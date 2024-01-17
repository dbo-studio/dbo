import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { queryRoutes } from './router/root';

const app = new Elysia().use(swagger()).use(cors()).use(queryRoutes).listen(8080);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
