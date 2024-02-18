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
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};
