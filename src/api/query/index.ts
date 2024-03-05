import api from '@/src/core/services/api';
import { EditedRow } from '@/src/types';
import { RUN_QUERY } from './endpoints';
import { transformRunQuery } from './transformers';
import { RunQueryType } from './types';

export const runQuery = (data: RunQueryType) => {
  return api.post(RUN_QUERY(), data).then(transformRunQuery);
};

export const updateQuery = (data: EditedRow[]) => {
  const formattedData = data.map((v) => {
    return {
      id: v.id,
      value: v.new
    };
  });

  return api.post(RUN_QUERY(), formattedData).then(transformRunQuery);
};
