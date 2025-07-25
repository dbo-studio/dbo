import { api } from '@/core/api';
import type { HistoryType } from '@/types/History';
import type { HistoryRequestType } from './types';

const endpoint = {
  getHistories: (): string => '/histories',
  deleteHistories: (): string => '/histories'
};

export const getHistories = async (params: HistoryRequestType): Promise<HistoryType[]> => {
  return (
    await api.get(endpoint.getHistories(), {
      params
    })
  ).data.data as HistoryType[];
};

export const deleteHistories = async (connectionId: number): Promise<void> => {
  return await api.delete(endpoint.deleteHistories(), {
    params: {
      connectionId
    }
  });
};
