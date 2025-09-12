import { api } from '@/core/api';
import type { CheckUpdateResponseType, ConfigResponseType } from './types';

const endpoint = {
  config: (): string => '/config',
  checkUpdate: (): string => '/config/check-update',
  logsPath: (): string => '/config/logs'
};

export const getConfig = async (): Promise<ConfigResponseType> => {
  return (await api.get(endpoint.config())).data.data as ConfigResponseType;
};

export const getCheckUpdate = async (): Promise<CheckUpdateResponseType> => {
  return (await api.get(endpoint.checkUpdate())).data.data as CheckUpdateResponseType;
};

export const getLogsPath = async (): Promise<Blob> => {
  const response = await api.get(endpoint.logsPath(), {
    responseType: 'blob'
  });

  return response.data;
};
