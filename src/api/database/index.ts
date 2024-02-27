import api from '@/src/core/services/api';
import { CREATE_DATABASE, DATABASE_META_DATA, DELETE_DATABASE } from './endpoints';
import { transformDatabaseMetaData } from './transformers';
import { createDatabaseType, deleteConnectionType } from './types';

export const getDatabaseMetadata = (connectionID: string | number) => {
  return api.get(DATABASE_META_DATA(connectionID)).then(transformDatabaseMetaData);
};

export const createDatabase = (data: createDatabaseType) => {
  return api.post(CREATE_DATABASE(), data);
};

export const deleteDatabase = (data: deleteConnectionType) => {
  return api.del(DELETE_DATABASE(), data);
};
