import { api } from '@/core/api';
import type { ConnectionType } from '@/types';
import type { CreateConnectionRequestType, UpdateConnectionRequestType } from './types';

const endpoint = {
  connectionList: () => '/connections',
  connectionDetail: (connectionID: string | number) => `/connections/${connectionID}`,
  createConnection: () => '/connections',
  updateConnection: (connectionID: string | number) => `/connections/${connectionID}`,
  deleteConnection: (connectionID: string | number) => `/connections/${connectionID}`,
  pingConnection: () => '/connections/ping'
};

export const getConnectionList = async () => {
  return (await api.get(endpoint.connectionList())).data.data as ConnectionType[];
};

export const getConnectionDetail = async (id: string | number) => {
  return (await api.get(endpoint.connectionDetail(id))).data.data as ConnectionType;
};

export const createConnection = async (data: CreateConnectionRequestType) => {
  return (await api.post(endpoint.createConnection(), data)).data.data as ConnectionType;
};

export const updateConnection = async (id: string | number, data: UpdateConnectionRequestType) => {
  return (await api.patch(endpoint.updateConnection(id), data)).data.data as ConnectionType;
};

export const deleteConnection = async (id: string | number) => {
  return (await api.delete(endpoint.deleteConnection(id))) as ConnectionType[];
};

export const pingConnection = async (data: CreateConnectionRequestType) => {
  return api.post(endpoint.pingConnection(), data);
};
