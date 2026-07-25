import { api } from '@/core/api';
import type { CheckUpdateResponseType, ConfigResponseType } from './types';

const endpoint = {
  config: (): string => '/config',
  checkUpdate: (): string => '/config/check-update',
  logsPath: (): string => '/config/logs',
  resetFactory: (): string => '/config/reset'
};

export const getConfig = async (): Promise<ConfigResponseType> => {
  return (await api.get<{ data: ConfigResponseType }>(endpoint.config())).data.data;
};

export const getCheckUpdate = async (): Promise<CheckUpdateResponseType> => {
  return (await api.get<{ data: CheckUpdateResponseType }>(endpoint.checkUpdate())).data.data;
};

export const getLogsPath = async (): Promise<Blob> => {
  const response = await api.get<Blob>(endpoint.logsPath(), {
    responseType: 'blob'
  });

  return response.data;
};

export const resetFactory = async (): Promise<void> => {
  await api.post(endpoint.resetFactory());
};
