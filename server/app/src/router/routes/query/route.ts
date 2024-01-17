import { Elysia } from 'elysia';
import { queryHandler } from './controller';
import { querySchema } from './schema';

export const queryRoutes = new Elysia({ prefix: '/query' }).post('/', queryHandler, querySchema);
