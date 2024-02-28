import api from '@/src/core/services/api';
import { RUN_QUERY } from './endpoints';
import { transformRunQuery } from './transformers';
import { RunQueryType } from './types';

export const runQuery = (data: RunQueryType) => {
  return api.post(RUN_QUERY(), data).then(transformRunQuery);
};
