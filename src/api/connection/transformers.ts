import { Connection, ConnectionAuth, Database, TableData } from './types';

export const transformConnectionData = (data: any): Connection => {
  return {
    id: data?.data?.id,
    name: data?.data?.name,
    type: data?.data?.type,
    auth: transformAuthData(data?.data?.auth),
    database: transformDatabaseData(data?.data?.database),
    driver: data?.data?.driver
  };
};

const transformAuthData = (data: any): ConnectionAuth => {
  return {
    database: data?.database,
    host: data?.host,
    port: data?.port
  };
};

const transformDatabaseData = (data: any): Database => {
  return {
    database: data?.database,
    schemes: data?.schemes?.map(transformSchemesData)
  };
};

const transformSchemesData = (data: any) => {
  return {
    name: data?.name,
    tables: data?.tables?.map(transformTableData)
  };
};

const transformTableData = (data: any): TableData => {
  return {
    columns: data?.columns,
    ddl: data?.ddl,
    name: data?.name
  };
};
