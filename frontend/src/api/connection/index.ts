import { api } from '@/core/api';
import type { ConnectionType } from '@/types';
import type { CreateConnectionRequestType, UpdateConnectionRequestType } from './types';

const endpoint = {
  connectionList: (): string => '/connections',
  connectionDetail: (connectionID: string | number): string => `/connections/${connectionID}`,
  createConnection: (): string => '/connections',
  updateConnection: (connectionID: string | number): string => `/connections/${connectionID}`,
  deleteConnection: (connectionID: string | number): string => `/connections/${connectionID}`,
  pingConnection: (): string => '/connections/ping'
};

export const getConnectionList = async (): Promise<ConnectionType[]> => {
  return (await api.get(endpoint.connectionList())).data.data as ConnectionType[];
};

export const getConnectionDetail = async (id: string | number): Promise<ConnectionType> => {
  return (await api.get(endpoint.connectionDetail(id))).data.data as ConnectionType;
};

export const createConnection = async (data: CreateConnectionRequestType): Promise<ConnectionType> => {
  return (await api.post(endpoint.createConnection(), data)).data.data as ConnectionType;
};

export const updateConnection = async (
  id: string | number,
  data: UpdateConnectionRequestType
): Promise<ConnectionType> => {
  return (await api.patch(endpoint.updateConnection(id), data)).data.data as ConnectionType;
};

export const deleteConnection = async (id: string | number): Promise<void> => {
  await api.delete(endpoint.deleteConnection(id));
};

export const pingConnection = async (data: CreateConnectionRequestType): Promise<void> => {
  return api.post(endpoint.pingConnection(), data);
};
