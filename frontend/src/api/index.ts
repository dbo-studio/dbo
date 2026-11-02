import * as adminUsers from './adminUsers';
import * as ai from './ai';
import * as aiAudit from './aiAudit';
import * as aiChat from './aiChat';
import * as aiProvider from './aiProvider';
import * as account from './account';
import * as auth from './auth';
import * as backup from './backup';
import * as config from './config';
import * as connection from './connection';
import * as dashboard from './dashboard';
import * as histories from './history';
import * as importExport from './importExport';
import * as job from './job';
import * as mcp from './mcp';
import * as notification from './notification';
import * as query from './query';
import * as question from './question';
import * as safeMode from './safeMode';
import * as savedQueries from './savedQuery';
import * as schema from './schema';
import * as tree from './tree';

const api = {
  account,
  auth,
  backup,
  adminUsers,
  config,
  connection,
  dashboard,
  query,
  question,
  savedQueries,
  histories,
  tree,
  importExport,
  job,
  ai,
  aiProvider,
  aiAudit,
  aiChat,
  mcp,
  notification,
  schema,
  safeMode
};

export default api;
