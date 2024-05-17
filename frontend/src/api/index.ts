import * as connection from './connection';
import * as database from './database';
import * as histories from './history';
import * as query from './query';
import * as savedQueries from './saved_query';

const api = {
  connection,
  database,
  query,
  savedQueries,
  histories
};

export default api;
