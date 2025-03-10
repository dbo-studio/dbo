import * as connection from './connection';
import * as database from './database';
import * as histories from './history';
import * as query from './query';
import * as savedQueries from './savedQuery';
import * as tree from './tree';

const api = {
  connection,
  database,
  query,
  savedQueries,
  histories,
  tree
};

export default api;
