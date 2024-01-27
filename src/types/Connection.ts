export type ConnectionType = {
  id: number;
  name: string;
  type: string;
  driver: string;
  auth: ConnectionAuthType;
  database: DatabaseType;
};

export type ConnectionAuthType = {
  host: string;
  port: number;
  database: string | null;
  passport?: string | null;
};

export type DatabaseType = {
  name: string;
  schemes: SchemaType[];
};

export type SchemaType = {
  name: string;
  tables: TableType[];
};

export type TableType = {
  name: string;
  dll: string;
  fields: any[];
};
