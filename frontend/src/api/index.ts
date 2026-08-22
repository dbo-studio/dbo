import * as ai from './ai';
import * as aiChat from './aiChat';
import * as aiProvider from './aiProvider';
import * as config from './config';
import * as connection from './connection';
import * as histories from './history';
import * as importExport from './importExport';
import * as job from './job';
import * as mcp from './mcp';
import * as query from './query';
import * as savedQueries from './savedQuery';
import * as schema from './schema';
import * as tree from './tree';

const api = {
  config,
  connection,
  query,
  savedQueries,
  histories,
  tree,
  importExport,
  job,
  ai,
  aiProvider,
  aiChat,
  mcp,
  schema
};

export default api;
