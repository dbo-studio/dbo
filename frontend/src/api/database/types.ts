export type createDatabaseType = {
  connectionId: number | string;
  name: string;
  template: string | undefined;
  encoding: string | undefined;
  tableSpace: string | undefined;
};

export type deleteConnectionType = {
  connectionId: number | string;
  name: string;
};

export type DatabaseMetaDataType = {
  templates: string[];
  tableSpaces: string[];
  encodings: string[];
  dataTypes: string[];
};
