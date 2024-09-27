import { connectionHandler } from './connections';
import { databasesHandler } from './databases';
import { historiesHandler } from './histories';
import { queriesHandler } from './queries';
import { savedQueriesHandler } from './savedQueries';

export const handlers = [
  ...connectionHandler,
  ...historiesHandler,
  ...savedQueriesHandler,
  ...queriesHandler,
  ...databasesHandler
];
