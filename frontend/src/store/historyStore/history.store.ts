import type { HistoryType } from '@/types/History';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HistoryStore } from './types';

type HistoryState = HistoryStore;

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      histories: undefined,
      upsertHistory: (history: HistoryType) => {
        let queries = get().histories;
        if (queries === undefined) {
          queries = [];
        }

        const findQuery = queries.findIndex((s) => s.id === history.id);
        if (findQuery === -1) {
          queries.push(history);
        } else {
          queries[findQuery] = history;
        }

        set({ histories: queries });
      },
      updateHistories: (histories: HistoryType[]) => {
        set({ histories: histories });
      }
    }),
    { name: 'history' }
  )
);
