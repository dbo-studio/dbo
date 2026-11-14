import { api } from '@/core/api';
import type { AutoCompleteType } from '@/types';
import type {
  AutoCompleteRequestType,
  BackgroundQueryType,
  RunQueryRequestType,
  RunQueryResponseType,
  RunRawQueryRequestType,
  TransactionRequestType,
  UpdateQueryRequestType,
  UpdateQueryResponseType
} from './types';

const endpoint = {
  runQuery: (): string => '/query/run',
  runRawQuery: (): string => '/query/raw',
  updateQuery: (): string => '/query/update',
  autoComplete: (): string => '/query/autocomplete',
  transaction: (action = ''): string => `/query/transaction${action}`
};

// The plain calls always wait for the answer; only a tab, which can show a waiting state, lets a slow
// query move to the background.
export const runQuery = async (data: RunQueryRequestType, signal?: AbortSignal): Promise<RunQueryResponseType> => {
  return (
    await api.post<{ data: RunQueryResponseType }>(
      endpoint.runQuery(),
      { ...data, backgroundAfterSeconds: 0 },
      { signal }
    )
  ).data.data;
};

export const runRawQuery = async (
  data: RunRawQueryRequestType,
  signal?: AbortSignal
): Promise<RunQueryResponseType> => {
  return (
    await api.post<{ data: RunQueryResponseType }>(
      endpoint.runRawQuery(),
      { ...data, backgroundAfterSeconds: 0 },
      { signal }
    )
  ).data.data;
};

export const runQueryInBackground = async (
  data: RunQueryRequestType,
  signal?: AbortSignal
): Promise<RunQueryResponseType | BackgroundQueryType> => {
  return (await api.post<{ data: RunQueryResponseType | BackgroundQueryType }>(endpoint.runQuery(), data, { signal }))
    .data.data;
};

export const runRawQueryInBackground = async (
  data: RunRawQueryRequestType,
  signal?: AbortSignal
): Promise<RunQueryResponseType | BackgroundQueryType> => {
  return (
    await api.post<{ data: RunQueryResponseType | BackgroundQueryType }>(endpoint.runRawQuery(), data, { signal })
  ).data.data;
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

export const beginTransaction = async (data: TransactionRequestType): Promise<void> => {
  await api.post(endpoint.transaction('/begin'), data);
};

export const endTransaction = async (data: TransactionRequestType, commit: boolean): Promise<void> => {
  await api.post(endpoint.transaction(commit ? '/commit' : '/rollback'), data);
};

export const transactionActive = async (data: TransactionRequestType): Promise<boolean> => {
  return (await api.get<{ data: { active: boolean } }>(endpoint.transaction(), { params: data })).data.data.active;
};
