import { ConnectionAuthType, ConnectionType } from '@/src/types';

export const transformConnections = (data: any): ConnectionType[] => {
  const connections: ConnectionType[] = [];
  data?.forEach((item: any) => {
    connections.push({
      id: item?.id,
      name: item?.name,
      type: item?.type,
      driver: item?.driver,
      auth: transformAuthData(item?.auth)
    });
  });

  return connections;
};

export const transformConnectionDetail = (data: any): ConnectionType => {
  return {
    id: data?.id,
    name: data?.name,
    type: data?.type,
    driver: data?.driver,
    current_database: data?.current_database,
    current_schema: data?.current_schema,
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
