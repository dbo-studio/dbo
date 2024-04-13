import * as connection from './connection';
import * as database from './database';
import * as query from './query';
import * as savedQueries from './saved_query';

const api = {
  connection,
  database,
  query,
  savedQueries
};

export default api;
