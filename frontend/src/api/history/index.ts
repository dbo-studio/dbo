import { api } from '@/core/api';
import type { HistoryType } from '@/types/History';

const endpoint = {
  getHistories: (): string => '/histories'
};

export const getHistories = async (): Promise<HistoryType[]> => {
  return (await api.get(endpoint.getHistories())).data.data as HistoryType[];
};
