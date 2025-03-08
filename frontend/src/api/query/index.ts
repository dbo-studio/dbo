import { api } from '@/core/api';
import type {
  AutoCompleteRequestType,
  RunQueryRequestType,
  RunQueryResponseType,
  RunRawQueryRequestType,
  UpdateQueryRequestType,
  UpdateQueryResponseType
} from './types';
import type { AutoCompleteType } from '@/types';

const endpoint = {
  runQuery: () => '/query/run',
  runRawQuery: () => '/query/raw',
  updateQuery: () => '/query/update',
  autoComplete: () => '/query/autocomplete'
};

export const runQuery = async (data: RunQueryRequestType): Promise<RunQueryResponseType> => {
  return (await api.post(endpoint.runQuery(), data)).data.data as RunQueryResponseType;
};

export const runRawQuery = async (data: RunRawQueryRequestType): Promise<RunQueryResponseType> => {
  return (await api.post(endpoint.runRawQuery(), data)).data.data as RunQueryResponseType;
};

export const autoComplete = async (data: AutoCompleteRequestType): Promise<AutoCompleteType> => {
  return (await api.get(endpoint.autoComplete(), { params: data })).data.data as AutoCompleteType;
};

export const updateQuery = async (data: UpdateQueryRequestType): Promise<UpdateQueryResponseType> => {
  const formattedData: {
    connectionId: number;
    nodeId: string;
    edited: object[];
    deleted: object[];
    added: object[];
  } = {
    connectionId: data.connectionId,
    nodeId: data.nodeId,
    edited: [],
    deleted: data.removed,
    added: data.added
  };

  for (const edited of data.edited) {
    formattedData.edited.push({
      conditions: edited?.conditions,
      values: edited.new
    });
  }

  return (await api.post(endpoint.updateQuery(), formattedData)).data.data as UpdateQueryResponseType;
};
