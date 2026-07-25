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
    await api.get<{ data: SavedQueryType[] }>(endpoint.getSavedQueries(), {
      params
    })
  ).data.data;
};

export const createSavedQuery = async (data: CreateSavedQueryType): Promise<SavedQueryType> => {
  return (await api.post<{ data: SavedQueryType }>(endpoint.createSavedQuery(), data)).data.data;
};

export const updateSavedQuery = async (data: UpdateSavedQueryType): Promise<SavedQueryType> => {
  return (await api.patch<{ data: SavedQueryType }>(endpoint.updateSavedQuery(data.id), data)).data.data;
};

export const deleteSavedQuery = async (id: number): Promise<void> => {
  await api.delete(endpoint.deleteSavedQuery(id));
};
