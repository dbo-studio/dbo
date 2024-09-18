import { connectionHandler } from './connections';
import { historiesHandler } from './histories';
import { savedQueriesHandler } from './savedQueries';

export const handlers = [...connectionHandler, ...historiesHandler, ...savedQueriesHandler];
