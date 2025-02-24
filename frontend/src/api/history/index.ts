import api from '@/core/services/api';
import { GET_HISTORIES } from './endpoints';
import { transformHistories } from './transformers';

export const getHistories = async () => {
  return api.get(GET_HISTORIES()).then(transformHistories);
};
