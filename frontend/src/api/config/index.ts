import { api } from '@/core/api';
import type { ConfigResponseType } from './types';

const endpoint = {
  config: (): string => '/config'
};

export const getConfig = async (): Promise<ConfigResponseType> => {
  return (await api.get(endpoint.config())).data.data as ConfigResponseType;
};
