export type PgConnectionType = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type QueryType = {
  table: string;
  columns: string[];
  filters: {
    column: string;
    operator: string;
    value: string;
  }[];
  sorts: {
    column: string;
    operator: string;
  }[];
};
