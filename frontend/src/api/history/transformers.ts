import type { HistoryType } from '@/types/History';

export const transformHistory = (data: any): HistoryType => {
  return {
    id: data?.id,
    query: data?.query,
    createdAt: data?.created_at
  };
};

export const transformHistories = (data: any): HistoryType[] => {
  const queries: HistoryType[] = [];
  for (const item of data) {
    queries.push(transformHistory(item));
  }

  return queries;
};
