import { api } from '@/core/api';
import type { SavedQueryType } from '@/types';
import type { CreateSavedQueryType, SavedQueryListRequestType, UpdateSavedQueryType } from './types';

const endpoint = {
  getSavedQueries: (): string => '/saved',
  createSavedQuery: (): string => '/saved',
  updateSavedQuery: (id: number): string => `/saved/${id}`,
  deleteSavedQuery: (id: number): string => `/saved/${id}`
};

export const getSavedQueries = async (params: SavedQueryListRequestType): Promise<SavedQueryType[]> => {
  return (
    await api.get(endpoint.getSavedQueries(), {
      params
    })
  ).data.data as SavedQueryType[];
};

export const createSavedQuery = async (data: CreateSavedQueryType): Promise<SavedQueryType> => {
  return (await api.post(endpoint.createSavedQuery(), data)).data.data as SavedQueryType;
};

export const updateSavedQuery = async (data: UpdateSavedQueryType): Promise<SavedQueryType> => {
  return (await api.patch(endpoint.updateSavedQuery(data.id), data)).data.data as SavedQueryType;
};

export const deleteSavedQuery = async (id: number): Promise<void> => {
  await api.delete(endpoint.deleteSavedQuery(id));
};
