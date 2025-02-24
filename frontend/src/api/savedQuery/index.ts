import api from '@/core/services/api';
import { CREATE_SAVED_QUERY, GET_SAVED_QUERIES, UPDATE_SAVED_QUERY } from './endpoints';
import { transformSavedQueries, transformSavedQuery } from './transformers';
import type { CreateSavedQueryType, UpdateSavedQueryType } from './types';

export const getSavedQueries = async () => {
  return api.get(GET_SAVED_QUERIES()).then(transformSavedQueries);
};

export const createSavedQuery = async (data: CreateSavedQueryType) => {
  return api.post(CREATE_SAVED_QUERY(), data).then(transformSavedQuery);
};

export const updateSavedQuery = async (data: UpdateSavedQueryType) => {
  return api.patch(UPDATE_SAVED_QUERY(data.id), data).then(transformSavedQuery);
};

export const deleteSavedQuery = async (id: number) => {
  return api.del(UPDATE_SAVED_QUERY(id));
};
