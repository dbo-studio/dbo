import type { ConnectionAuthType, ConnectionType } from '@/types';
import type { DatabaseMetaDataType } from './types';

export const transformDatabaseMetaData = (data: any): DatabaseMetaDataType => {
  return {
    templates: data?.templates,
    tableSpaces: data?.tableSpaces,
    encodings: data?.encodings,
    dataTypes: data?.dataTypes
  };
};

export const transformConnectionDetail = (data: any): ConnectionType => {
  return {
    id: data?.id,
    name: data?.name,
    type: data?.type,
    driver: data?.driver,
    currentDatabase: data?.currentDatabase,
    currentSchema: data?.currentSchema,
    isActive: data?.isActive,
    auth: transformAuthData(data?.auth),
    databases: data?.databases,
    schemas: data?.schemas,
    tables: data?.tables
  };
};

const transformAuthData = (data: any): ConnectionAuthType => {
  return {
    database: data?.database,
    host: data?.host,
    port: data?.port,
    username: data.username
  };
};
