import * as connection from './connection';
import * as histories from './history';
import * as importExport from './importExport';
import * as job from './job';
import * as query from './query';
import * as savedQueries from './savedQuery';
import * as tree from './tree';

const api = {
  connection,
  query,
  savedQueries,
  histories,
  tree,
  importExport,
  job
};

export default api;
