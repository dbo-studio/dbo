import type { SavedQueryType } from '@/types';

export type SavedQueryStore = {
  savedQueries: SavedQueryType[] | undefined;
  upsertQuery: (savedQuery: SavedQueryType) => void;
  deleteQuery: (id: number) => void;
};
