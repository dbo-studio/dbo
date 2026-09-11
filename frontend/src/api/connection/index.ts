import { api } from '@/core/api';
import type { ConnectionType } from '@/types';
import type {
  AdminConnectionShareType,
  ConnectionSharesType,
  CreateConnectionRequestType,
  PingConnectionRequestType,
  PingConnectionResponseType,
  SafeModeUnlockResponseType,
  SetConnectionCredentialsRequestType,
  UpdateConnectionRequestType
} from './types';

const endpoint = {
  connectionList: (): string => '/connections',
  createConnection: (): string => '/connections',
  updateConnection: (connectionID: string | number): string => `/connections/${connectionID}`,
  setCredentials: (connectionID: string | number): string => `/connections/${connectionID}/credentials`,
  deleteConnection: (connectionID: string | number): string => `/connections/${connectionID}`,
  pingConnection: (): string => '/connections/ping',
  unlockSafeMode: (connectionID: string | number): string => `/connections/${connectionID}/safe-mode/unlock`,
  lockSafeMode: (connectionID: string | number): string => `/connections/${connectionID}/safe-mode/lock`,
  shares: (connectionID: string | number): string => `/connections/${connectionID}/shares`,
  shareUser: (connectionID: string | number, userID: string): string => `/connections/${connectionID}/shares/${userID}`,
  leaveShare: (connectionID: string | number): string => `/connections/${connectionID}/leave`,
  passwordShare: (connectionID: string | number): string => `/connections/${connectionID}/password-share`,
  adminShares: (): string => '/admin/shares'
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

export const setConnectionCredentials = async (data: SetConnectionCredentialsRequestType): Promise<void> => {
  await api.post(endpoint.setCredentials(data.id), data);
};

export const deleteConnection = async (id: string | number): Promise<void> => {
  await api.delete(endpoint.deleteConnection(id));
};

export const pingConnection = async (data: PingConnectionRequestType): Promise<PingConnectionResponseType> => {
  return (await api.post<{ data: PingConnectionResponseType }>(endpoint.pingConnection(), data)).data.data;
};

export const unlockSafeMode = async (
  id: string | number,
  password: string,
  ttlMinutes = 10
): Promise<SafeModeUnlockResponseType> => {
  return (await api.post<{ data: SafeModeUnlockResponseType }>(endpoint.unlockSafeMode(id), { password, ttlMinutes }))
    .data.data;
};

export const lockSafeMode = async (id: string | number): Promise<void> => {
  await api.post(endpoint.lockSafeMode(id));
};

export const listShares = async (id: string | number): Promise<ConnectionSharesType> => {
  return (await api.get<{ data: ConnectionSharesType }>(endpoint.shares(id))).data.data;
};

export const createShare = async (
  id: string | number,
  payload: { userId: string; role: string; passwordShared?: boolean }
): Promise<ConnectionSharesType> => {
  return (await api.post<{ data: ConnectionSharesType }>(endpoint.shares(id), payload)).data.data;
};

export const updateShare = async (
  id: string | number,
  userId: string,
  payload: { role: string }
): Promise<ConnectionSharesType> => {
  return (await api.patch<{ data: ConnectionSharesType }>(endpoint.shareUser(id, userId), payload)).data.data;
};

export const deleteShare = async (id: string | number, userId: string): Promise<ConnectionSharesType> => {
  return (await api.delete<{ data: ConnectionSharesType }>(endpoint.shareUser(id, userId))).data.data;
};

export const leaveShare = async (id: string | number): Promise<void> => {
  await api.post(endpoint.leaveShare(id));
};

export const updatePasswordShare = async (id: string | number, enabled: boolean): Promise<ConnectionSharesType> => {
  return (await api.patch<{ data: ConnectionSharesType }>(endpoint.passwordShare(id), { enabled })).data.data;
};

export const listAdminShares = async (): Promise<AdminConnectionShareType[]> => {
  return (await api.get<{ data: AdminConnectionShareType[] }>(endpoint.adminShares())).data.data;
};
