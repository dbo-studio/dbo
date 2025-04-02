import { api } from '@/core/api';
import type { CreateSavedQueryType, SavedQueryResponseType, UpdateSavedQueryType } from './types';

const endpoint = {
  getSavedQueries: (): string => '/saved',
  createSavedQuery: (): string => '/saved',
  updateSavedQuery: (id: number): string => `/saved/${id}`,
  deleteSavedQuery: (id: number): string => `/saved/${id}`
};

export const getSavedQueries = async (): Promise<SavedQueryResponseType[]> => {
  return (await api.get(endpoint.getSavedQueries())).data.data as SavedQueryResponseType[];
};

export const createSavedQuery = async (data: CreateSavedQueryType): Promise<SavedQueryResponseType> => {
  return (await api.post(endpoint.createSavedQuery(), data)).data.data as SavedQueryResponseType;
};

export const updateSavedQuery = async (data: UpdateSavedQueryType): Promise<SavedQueryResponseType> => {
  return (await api.patch(endpoint.updateSavedQuery(data.id), data)).data.data as SavedQueryResponseType;
};

export const deleteSavedQuery = async (id: number): Promise<void> => {
  await api.delete(endpoint.deleteSavedQuery(id));
};
