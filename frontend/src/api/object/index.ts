import { GET_OBJECTS_QUERIES } from '@/api/object/endpoints.ts';
import api from '@/core/services/api';
import { transformObject } from './transformers';

export const getObjects = async () => {
  return api.get(GET_OBJECTS_QUERIES()).then(transformObject);
};
