import Pg from '../../../drivers/pg';

export default class QueryHandler {
  async run({ body }: any) {
    const result = await new Pg({
      host: 'localhost',
      port: 9041,
      user: 'default',
      password: 'secret',
      database: 'default'
    }).query({
      table: body.table,
      columns: body.columns,
      filters: body.filters,
      sorts: body.sorts
    });

    return result;
  }
}
