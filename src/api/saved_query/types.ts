import { SavedQueryType } from '@/src/types';

export interface SavedQueryResponseType extends SavedQueryType {}

export type CreateSavedQueryType = {
  name?: string;
  query: string;
};

export type UpdateSavedQueryType = {
  id: number;
  name?: string;
  query: string;
};
