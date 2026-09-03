import { api } from '@/core/api';
import type { AutoCompleteType } from '@/types';
import type {
  AutoCompleteRequestType,
  RunQueryRequestType,
  RunQueryResponseType,
  RunRawQueryRequestType,
  UpdateQueryRequestType,
  UpdateQueryResponseType
} from './types';

const endpoint = {
  runQuery: (): string => '/query/run',
  runRawQuery: (): string => '/query/raw',
  updateQuery: (): string => '/query/update',
  autoComplete: (): string => '/query/autocomplete'
};

export const runQuery = async (data: RunQueryRequestType, signal?: AbortSignal): Promise<RunQueryResponseType> => {
  return (await api.post<{ data: RunQueryResponseType }>(endpoint.runQuery(), data, { signal })).data.data;
};

export const runRawQuery = async (
  data: RunRawQueryRequestType,
  signal?: AbortSignal
): Promise<RunQueryResponseType> => {
  return (await api.post<{ data: RunQueryResponseType }>(endpoint.runRawQuery(), data, { signal })).data.data;
};

export const autoComplete = async (data: AutoCompleteRequestType): Promise<AutoCompleteType> => {
  return (await api.get<{ data: AutoCompleteType }>(endpoint.autoComplete(), { params: data })).data.data;
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

  return (
    await api.post<{ data: UpdateQueryResponseType }>(endpoint.updateQuery(), {
      ...formattedData,
      confirmed: data.confirmed
    })
  ).data.data;
};
