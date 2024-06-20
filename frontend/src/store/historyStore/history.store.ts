import { HistoryType } from '@/src/types/History';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { HistoryStore } from './types';
import { immer } from 'zustand/middleware/immer';

type HistoryState = HistoryStore;

export const useHistoryStore = create<HistoryState>()(
  devtools(
    immer((set, get) => ({
      histories: undefined,
      upsertHistory: (history: HistoryType) => {
        let queries = get().histories;
        if (queries == undefined) {
          queries = [];
        }

        const findQuery = queries.findIndex((s) => s.id == history.id);
        if (findQuery == -1) {
          queries.push(history);
        } else {
          queries[findQuery] = history;
        }

        set({ histories: queries });
      },
      updateHistories: (histories: HistoryType[]) => {
        set({ histories: histories });
      }
    })),
    { name: 'history' }
  )
);
