export interface ConnectionType {
  id: number;
  name: string;
  type: string;
  driver: string;
  current_database?: string;
  current_schema?: string;
  auth: ConnectionAuthType;
  databases?: string[];
  schemas?: string[];
  tables?: string[];
}

export interface ConnectionAuthType {
  database: string;
  host: string;
  port: number;
  username: string;
}
