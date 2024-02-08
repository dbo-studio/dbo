export interface Connection {
  id: number;
  name: string;
  type: string;
  auth: ConnectionAuth;
  database: Database;
  driver: string;
}

export interface Database {
  database: string;
  schemes: Schemes[];
}

export interface Schemes {
  name: string;
  tables: TableData[];
}

export interface ConnectionAuth {
  database: string;
  host: string;
  port: number;
}

export interface TableData {
  columns: any[];
  ddl: string;
  name: string;
}
