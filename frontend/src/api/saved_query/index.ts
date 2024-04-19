import api from '@/src/core/services/api';
import { CREATE_SAVED_QUERY, GET_SAVED_QUERIES, UPDATE_SAVED_QUERY } from './endpoints';
import { transformSavedQueries, transformSavedQuery } from './transformers';
import { CreateSavedQueryType, UpdateSavedQueryType } from './types';

export const getSavedQueries = () => {
  return api.get(GET_SAVED_QUERIES()).then(transformSavedQueries);
};

export const createSavedQuery = (data: CreateSavedQueryType) => {
  return api.post(CREATE_SAVED_QUERY(), data).then(transformSavedQuery);
};

export const updateSavedQuery = (data: UpdateSavedQueryType) => {
  console.log(data);
  
  return api.patch(UPDATE_SAVED_QUERY(data.id), data).then(transformSavedQuery);
};

export const deleteSavedQuery = (id: number) => {
  return api.del(UPDATE_SAVED_QUERY(id));
};
