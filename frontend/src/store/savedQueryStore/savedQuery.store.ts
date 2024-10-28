import type { SavedQueryType } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SavedQueryStore } from './types';

type SavedQueryState = SavedQueryStore;

export const useSavedQueryStore = create<SavedQueryState>()(
  devtools(
    (set, get) => ({
      savedQueries: undefined,
      upsertQuery: (savedQuery: SavedQueryType) => {
        let queries = get().savedQueries;
        if (queries === undefined) {
          queries = [];
        }

        const findQuery = queries.findIndex((s) => s.id === savedQuery.id);
        if (findQuery === -1) {
          queries.push(savedQuery);
        } else {
          queries[findQuery] = savedQuery;
        }

        set({ savedQueries: queries });
      },
      deleteQuery: (id: number) => {
        let queries = get().savedQueries;
        if (queries === undefined) {
          return;
        }

        queries = queries.filter((s) => s.id !== id);
        set({ savedQueries: queries });
      }
    }),
    { name: 'saved_query' }
  )
);
