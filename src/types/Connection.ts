export interface ConnectionType {
  id: number;
  name: string;
  type: string;
  driver: string;
  currentDatabase?: string;
  currentSchema?: string;
  isActive: boolean;
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
