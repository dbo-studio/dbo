import type { SavedQueryType } from '@/types';

export interface SavedQueryResponseType extends SavedQueryType {}

export type SavedQueryListRequestType = {
  connectionId: number;
  page?: number;
  count?: number;
};

export type CreateSavedQueryType = {
  name?: string;
  query: string;
};

export type UpdateSavedQueryType = {
  id: number;
  name?: string;
  query: string;
};
