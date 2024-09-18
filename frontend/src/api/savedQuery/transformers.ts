import type { SavedQueryResponseType } from './types';

export const transformSavedQuery = (data: any): SavedQueryResponseType => {
  return {
    id: data?.id,
    name: data?.name,
    query: data?.query
  };
};

export const transformSavedQueries = (data: any): SavedQueryResponseType[] => {
  const queries: SavedQueryResponseType[] = [];
  for (const item of data) {
    queries.push(transformSavedQuery(item));
  }

  return queries;
};
