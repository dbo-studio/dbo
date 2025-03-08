import { api } from '@/core/api';
import type { connectionDetailType, createConnectionType, updateConnectionType } from './types';
import type { ConnectionType } from '@/types';

const endpoint = {
  connectionList: () => '/connections',
  connectionDetail: (connectionID: string | number) => `/connections/${connectionID}`,
  createConnection: () => '/connections',
  updateConnection: (connectionID: string | number) => `/connections/${connectionID}`,
  deleteConnection: (connectionID: string | number) => `/connections/${connectionID}`,
  testConnection: () => '/connections/test'
};

export const getConnectionList = async () => {
  return (await api.get(endpoint.connectionList())).data.data as ConnectionType[];
};

export const getConnectionDetail = async (data: connectionDetailType) => {
  return (
    await api.get(endpoint.connectionDetail(data.connectionId), {
      params: {
        fromCache: data.fromCache
      }
    })
  ).data.data as ConnectionType;
};

export const createConnection = async (data: createConnectionType) => {
  return (
    await api.post(endpoint.createConnection(), {
      ...data,
      port: Number(data.port)
    })
  ).data.data as ConnectionType;
};

export const updateConnection = async (data: updateConnectionType) => {
  return (
    await api.patch(endpoint.updateConnection(data.id), {
      ...data,
      port: Number(data.port)
    })
  ).data.data as ConnectionType;
};

export const deleteConnection = async (connectionId: string | number) => {
  return (await api.delete(endpoint.deleteConnection(connectionId))) as ConnectionType[];
};

export const testConnection = async (data: createConnectionType) => {
  return api.post(endpoint.testConnection(), {
    ...data,
    port: Number(data.port)
  });
};
