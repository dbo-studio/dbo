import { api } from '@/core/api';

export type SafeModePasswordStatusType = {
  configured: boolean;
};

export type SafeModeUnlockResponseType = {
  unlockedUntil?: string;
};

const endpoint = {
  status: (): string => '/safe-mode/password',
  setPassword: (): string => '/safe-mode/password',
  verify: (): string => '/safe-mode/verify'
};

export const getStatus = async (): Promise<SafeModePasswordStatusType> => {
  return (await api.get<{ data: SafeModePasswordStatusType }>(endpoint.status())).data.data;
};

export const setPassword = async (password: string, confirm: string): Promise<void> => {
  await api.post(endpoint.setPassword(), { password, confirm });
};

export const changePassword = async (currentPassword: string, password: string, confirm: string): Promise<void> => {
  await api.patch(endpoint.setPassword(), { currentPassword, password, confirm });
};

export const verify = async (password: string, connectionId?: number): Promise<SafeModeUnlockResponseType> => {
  return (
    await api.post<{ data: SafeModeUnlockResponseType }>(endpoint.verify(), {
      password,
      connectionId
    })
  ).data.data;
};
