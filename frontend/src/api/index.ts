import * as connection from './connection';
import * as histories from './history';
import * as query from './query';
import * as savedQueries from './savedQuery';
import * as tree from './tree';

const api = {
  connection,
  query,
  savedQueries,
  histories,
  tree
};

export default api;
