import type { HistoryType } from '@/types/History';

export type HistoryStore = {
  histories: HistoryType[] | undefined;
  upsertHistory: (history: HistoryType) => void;
  updateHistories: (histories: HistoryType[]) => void;
};
