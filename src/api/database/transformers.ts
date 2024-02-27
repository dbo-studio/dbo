import { ConnectionAuthType, ConnectionType } from '@/src/types';
import { DatabaseMetaDataType } from './types';

export const transformDatabaseMetaData = (data: any): DatabaseMetaDataType => {
  return {
    templates: data?.templates,
    tableSpaces: data?.table_spaces,
    encodings: data?.encodings
  };
};

export const transformConnectionDetail = (data: any): ConnectionType => {
  return {
    id: data?.id,
    name: data?.name,
    type: data?.type,
    driver: data?.driver,
    currentDatabase: data?.current_database,
    currentSchema: data?.current_schema,
    isActive: data?.is_active,
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
