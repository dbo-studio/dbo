import { SavedQueryType } from '@/src/types';

export type SavedQueryStore = {
  savedQueries: SavedQueryType[];
  upsert: (savedQuery: SavedQueryType) => void;
  delete: (id: number) => void;
};
