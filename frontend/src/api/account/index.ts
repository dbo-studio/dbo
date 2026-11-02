import { api } from '@/core/api';
import type { AccountConnectPoll, AccountConnectStart } from './types';

// Sign up, sign in and password reset happen on the website. The app only starts the connection and waits.
const endpoint = {
  connectStart: (): string => '/v1/account/connect/start',
  connectPoll: (): string => '/v1/account/connect/poll'
};

export const connectStart = async (): Promise<AccountConnectStart> => {
  return (await api.post<{ data: AccountConnectStart }>(endpoint.connectStart())).data.data;
};

export const connectPoll = async (code: string): Promise<AccountConnectPoll> => {
  return (await api.post<{ data: AccountConnectPoll }>(endpoint.connectPoll(), { code })).data.data;
};
