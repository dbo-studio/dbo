import api from '@/src/core/services/api';
import { EditedRow } from '@/src/types';
import { AUTOCOMPLETE_QUERY, RUN_QUERY, RUN_RAW_QUERY, UPDATE_QUERY } from './endpoints';
import { transformRunQuery } from './transformers';
import { AutoCompleteType, RunQueryType, RunRawQueryType, UpdateQueryType } from './types';

export const runQuery = async (data: RunQueryType) => {
  return api.post(RUN_QUERY(), data).then(transformRunQuery);
};

export const runRawQuery = async (data: RunRawQueryType) => {
  return api.post(RUN_RAW_QUERY(), data).then(transformRunQuery);
};

export const autoComplete = async (data: AutoCompleteType) => {
  return api.get(AUTOCOMPLETE_QUERY(), data);
};

export const updateQuery = async (data: UpdateQueryType) => {
  const formattedData: {
    connection_id: number;
    table: string;
    schema: string;
    database: string;
    edited: object[];
    deleted: object[];
    added: object[];
  } = {
    connection_id: data.connection_id,
    table: data.table,
    schema: data.schema,
    database: data.database,
    edited: [],
    deleted: data.removed,
    added: data.added
  };

  data.edited.forEach((edited: EditedRow) => {
    formattedData.edited.push({
      conditions: edited.conditions,
      values: edited.new
    });
  });

  return api.post(UPDATE_QUERY(), formattedData).then(transformRunQuery);
};
