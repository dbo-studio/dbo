import { api } from '@/core/api';
import type {
  AuthDirectoryUser,
  AuthLoginResponse,
  AuthStatusType,
  AuthTotpSetupResponse,
  AuthTotpStatusType
} from './types';

const endpoint = {
  status: (): string => '/auth/status',
  login: (): string => '/auth/login',
  loginTotp: (): string => '/auth/login/totp',
  password: (): string => '/auth/password',
  logout: (): string => '/auth/logout',
  users: (): string => '/users',
  totpStatus: (): string => '/auth/totp/status',
  totpSetup: (): string => '/auth/totp/setup',
  totpEnable: (): string => '/auth/totp/enable',
  totpDisable: (): string => '/auth/totp/disable'
};

export const getStatus = async (): Promise<AuthStatusType> => {
  return (await api.get<{ data: AuthStatusType }>(endpoint.status())).data.data;
};

export const login = async (email: string, password: string): Promise<AuthLoginResponse | undefined> => {
  const res = await api.post<{ data?: AuthLoginResponse }>(endpoint.login(), { email, password });
  return res.data.data;
};

export const loginTotp = async (challengeToken: string, code: string): Promise<void> => {
  await api.post(endpoint.loginTotp(), { challengeToken, code });
};

export const changePassword = async (currentPassword: string, password: string, confirm: string): Promise<void> => {
  await api.post(endpoint.password(), { currentPassword, password, confirm });
};

export const logout = async (): Promise<void> => {
  await api.post(endpoint.logout());
};

export const listDirectoryUsers = async (): Promise<AuthDirectoryUser[]> => {
  return (await api.get<{ data: AuthDirectoryUser[] }>(endpoint.users())).data.data;
};

export const getTotpStatus = async (): Promise<AuthTotpStatusType> => {
  return (await api.get<{ data: AuthTotpStatusType }>(endpoint.totpStatus())).data.data;
};

export const setupTotp = async (): Promise<AuthTotpSetupResponse> => {
  return (await api.post<{ data: AuthTotpSetupResponse }>(endpoint.totpSetup())).data.data;
};

export const enableTotp = async (code: string): Promise<void> => {
  await api.post(endpoint.totpEnable(), { code });
};

export const disableTotp = async (password: string, code: string): Promise<void> => {
  await api.post(endpoint.totpDisable(), { password, code });
};
