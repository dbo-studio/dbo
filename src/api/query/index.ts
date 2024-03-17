import api from '@/src/core/services/api';
import { EditedRow } from '@/src/types';
import { RUN_QUERY, RUN_RAW_QUERY } from './endpoints';
import { transformRunQuery } from './transformers';
import { RunQueryType, RunRawQueryType } from './types';

export const runQuery = (data: RunQueryType) => {
  return api.post(RUN_QUERY(), data).then(transformRunQuery);
};

export const runRawQuery = (data: RunRawQueryType) => {
  return api.post(RUN_RAW_QUERY(), data).then(transformRunQuery);
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
