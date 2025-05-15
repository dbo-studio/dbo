export type SavedQueryListRequestType = {
  connectionId: number;
  page?: number;
  count?: number;
};

export type CreateSavedQueryType = {
  connectionId: number;
  name?: string;
  query: string;
};

export type UpdateSavedQueryType = {
  id: number;
  name?: string;
  query: string;
};
