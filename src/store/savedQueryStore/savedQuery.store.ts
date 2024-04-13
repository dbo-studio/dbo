import { SavedQueryType } from '@/src/types';
import { create } from 'zustand';
import { SavedQueryStore } from './types';

type SavedQueryState = SavedQueryStore;

export const useSavedQueryStore = create<SavedQueryState>()((set, get) => ({
  savedQueries: [],
  upsert: (savedQuery: SavedQueryType) => {
    const queries = get().savedQueries;
    const findQuery = queries.findIndex((s) => s.id == savedQuery.id);
    if (findQuery == -1) {
      queries.push(savedQuery);
    } else {
      queries[findQuery] = savedQuery;
    }

    set({ savedQueries: queries });
  },
  delete: (id: number) => {
    const queries = get().savedQueries.filter((s) => s.id !== id);
    set({ savedQueries: queries });
  }
}));
