import { Client } from 'pg';

import { PgConnectionType, QueryType } from './types';

export default class Pg {
  client: Client;

  constructor(connection: PgConnectionType) {
    this.client = new Client({
      host: connection.host,
      user: connection.user,
      port: connection.port,
      password: connection.password
    });
  }

  async query(q: QueryType) {
    await this.client.connect();

    const columns = q.columns.join(', ');

    // const result = await this.client.query(`SELECT * FROM ${q.table} WHERE id = $1`, [req.params.id]);
    const result = await this.client.query(`SELECT ${columns} FROM ${q.table}`);
    return result.rows;
  }
}
