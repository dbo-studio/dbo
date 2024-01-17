import { Elysia } from 'elysia';
import QueryHandler from './controller';
import { querySchema } from './schema';

const queryHandler = new QueryHandler();

export const queryRoutes = new Elysia({ prefix: '/query' }).post('/', queryHandler.run, querySchema);
