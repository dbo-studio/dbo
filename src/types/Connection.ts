export type ConnectionType = {
  info: ConnectionInfoType;
  auth: ConnectionAuthType;
  databases: DatabaseType[];
};

export interface ConnectionInfoType {
  name: string;
  type: string;
  driver: string;
}

export type ConnectionAuthType = {
  host: string;
  port: number;
  database: string | null;
  passport: string | null;
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
