import { http, passthrough } from 'msw';
import { connectionHandler } from './connections';
import { databasesHandler } from './databases';
import { historiesHandler } from './histories';
import { queriesHandler } from './queries';
import { savedQueriesHandler } from './savedQueries';
import { objectsHandler } from '@/core/mocks/handlers/objects.ts';

export const handlers = [
  http.get('/node_modules/*', () => {
    return passthrough();
  }),
  http.get('/src/*', () => {
    return passthrough();
  }),
  http.get('/vite*', () => {
    return passthrough();
  }),
  http.get('/images/*', () => {
    return passthrough();
  }),
  ...connectionHandler,
  ...historiesHandler,
  ...savedQueriesHandler,
  ...queriesHandler,
  ...databasesHandler,
  ...objectsHandler
];
