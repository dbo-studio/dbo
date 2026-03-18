import { api } from '@/core/api';
import type { ConnectionType } from '@/types';
import type {
  CreateConnectionRequestType,
  SetConnectionCredentialsRequestType,
  UpdateConnectionRequestType
} from './types';

const endpoint = {
  connectionList: (): string => '/connections',
  createConnection: (): string => '/connections',
  updateConnection: (connectionID: string | number): string => `/connections/${connectionID}`,
  setCredentials: (connectionID: string | number): string => `/connections/${connectionID}/credentials`,
  deleteConnection: (connectionID: string | number): string => `/connections/${connectionID}`,
  pingConnection: (): string => '/connections/ping'
};

export const getConnectionList = async (): Promise<ConnectionType[]> => {
  return (await api.get<{ data: ConnectionType[] }>(endpoint.connectionList())).data.data;
};

export const createConnection = async (data: CreateConnectionRequestType): Promise<void> => {
  return await api.post(endpoint.createConnection(), data);
};

export const updateConnection = async (
  id: string | number,
  data: UpdateConnectionRequestType
): Promise<ConnectionType> => {
  return (await api.patch<{ data: ConnectionType }>(endpoint.updateConnection(id), data)).data.data;
};

export const setConnectionCredentials = async (
  id: string | number,
  data: SetConnectionCredentialsRequestType
): Promise<void> => {
  await api.post(endpoint.setCredentials(id), data);
};

export const deleteConnection = async (id: string | number): Promise<void> => {
  await api.delete(endpoint.deleteConnection(id));
};

export const pingConnection = async (data: CreateConnectionRequestType): Promise<void> => {
  return api.post(endpoint.pingConnection(), data);
};
