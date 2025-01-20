export type createDatabaseType = {
  connection_id: number | string;
  name: string;
  template: string | undefined;
  encoding: string | undefined;
  tableSpace: string | undefined;
};

export type deleteConnectionType = {
  connection_id: number | string;
  name: string;
};

export type DatabaseMetaDataType = {
  templates: string[];
  tableSpaces: string[];
  encodings: string[];
  dataTypes: string[];
};
