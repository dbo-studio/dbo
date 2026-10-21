import { api } from '@/core/api';
import type {
  AiChangeset,
  AiChangesetOpStatus,
  AiChatType,
  SchemaChangeOp,
  TableStructure,
  WritePreview
} from '@/types';
import type { AiChatDetailRequestType, AiChatRequestType, CreateChatRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/chats',
  detail: (chatID: string | number): string => `/ai/chats/${chatID}`,
  create: (): string => '/ai/chats',
  update: (chatID: string | number): string => `/ai/chats/${chatID}`,
  feedback: (chatID: string | number): string => `/ai/chats/${chatID}/feedback`,
  changesets: (chatID: number): string => `/ai/chats/${chatID}/changesets`,
  changeset: (chatID: number, id: number): string => `/ai/chats/${chatID}/changesets/${id}`,
  delete: (chatID: string | number): string => `/ai/chats/${chatID}`
};

export const getChats = async (params: AiChatRequestType): Promise<AiChatType[]> => {
  return (await api.get<{ data: AiChatType[] }>(endpoint.list(), { params })).data.data;
};

export const getChatDetail = async (params: AiChatDetailRequestType): Promise<AiChatType> => {
  return (
    await api.get<{ data: AiChatType }>(endpoint.detail(params.id), {
      params: {
        page: params.page,
        count: params.count
      }
    })
  ).data.data;
};

export const createChat = async (data: CreateChatRequestType): Promise<AiChatType> => {
  return (await api.post<{ data: AiChatType }>(endpoint.create(), data)).data.data;
};

export const updateChat = async (
  id: string | number,
  data: { title?: string; pinned?: boolean }
): Promise<AiChatType> => {
  return (await api.patch<{ data: AiChatType }>(endpoint.update(id), data)).data.data;
};

export const getChangesets = async (chatId: number): Promise<AiChangeset[]> => {
  return (await api.get<{ data: AiChangeset[] }>(endpoint.changesets(chatId))).data.data;
};

/** Accepts, rejects or resets one op, or every op not applied yet when `position` is omitted. */
export const reviewChangeset = async (
  changeset: AiChangeset,
  status: Exclude<AiChangesetOpStatus, 'applied' | 'failed'>,
  position?: number
): Promise<AiChangeset> => {
  return (
    await api.patch<{ data: AiChangeset }>(endpoint.changeset(changeset.chatId, changeset.id), { status, position })
  ).data.data;
};

/** The live definition of the tables the changeset changes, by table name. */
export const getChangesetBefore = async (
  changeset: Pick<AiChangeset, 'chatId' | 'id'>
): Promise<Record<string, TableStructure>> => {
  return (
    await api.get<{ data: Record<string, TableStructure> }>(
      `${endpoint.changeset(changeset.chatId, changeset.id)}/before`
    )
  ).data.data;
};

/** What a data change of the changeset would do right now, without doing it. */
export const getWritePreview = async (chatId: number, id: number, position: number): Promise<WritePreview> => {
  return (await api.get<{ data: WritePreview }>(`${endpoint.changeset(chatId, id)}/ops/${position}/preview`)).data.data;
};

/** Replaces the definition of an op that was not applied yet; the op goes back to pending. */
export const editChangesetOp = async (
  changeset: AiChangeset,
  position: number,
  op: SchemaChangeOp
): Promise<AiChangeset> => {
  return (
    await api.put<{ data: AiChangeset }>(`${endpoint.changeset(changeset.chatId, changeset.id)}/ops/${position}`, op)
  ).data.data;
};

/** The SQL the server would run for the ops still open. */
export const previewChangeset = async (changeset: AiChangeset): Promise<string[]> => {
  return (
    await api.post<{ data: { queries: string[] } }>(`${endpoint.changeset(changeset.chatId, changeset.id)}/preview`)
  ).data.data.queries;
};

/** Applies the ops still open under Safe Mode — call through withSafeModeRetry. */
export const applyChangeset = async (changeset: AiChangeset, confirmed: boolean): Promise<AiChangeset> => {
  return (
    await api.post<{ data: AiChangeset }>(`${endpoint.changeset(changeset.chatId, changeset.id)}/apply`, { confirmed })
  ).data.data;
};

/** Turns the applied ops of a changeset into a new changeset of undo SQL, to review and apply like any other. */
export const undoChangeset = async (changeset: AiChangeset): Promise<AiChangeset> => {
  return (await api.post<{ data: AiChangeset }>(`${endpoint.changeset(changeset.chatId, changeset.id)}/undo`)).data
    .data;
};

/** Sends a rating of the newest answer, with its question and answer, to the DBO team. Nothing is kept locally. */
export const sendFeedback = async (
  chatId: string | number,
  data: { rating: 'up' | 'down'; comment?: string }
): Promise<void> => {
  await api.post(endpoint.feedback(chatId), data);
};

export const deleteChat = async (id: string | number): Promise<void> => {
  return await api.delete(endpoint.delete(id));
};
