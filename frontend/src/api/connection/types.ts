export type connectionDetailType = {
  connectionID: string | number;
  fromCache: boolean;
};

export type createConnectionType = {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

export type updateConnectionType = {
  id: number | string;
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  is_active?: boolean;
  current_database?: string;
  current_schema?: string;
};
