import { SavedQueryResponseType } from './types';

export const transformSavedQuery = (data: any): SavedQueryResponseType => {
  return {
    id: data?.id,
    name: data?.name,
    query: data?.query
  };
};

export const transformSavedQueries = (data: any): SavedQueryResponseType[] => {
  const queries: SavedQueryResponseType[] = [];
  data?.forEach((item: any) => {
    queries.push(transformSavedQuery(item));
  });

  return queries;
};
