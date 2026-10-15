import { api } from '@/core/api';
import type { AiChatType } from '@/types';
import type { AiChatDetailRequestType, AiChatRequestType, CreateChatRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/chats',
  detail: (chatID: string | number): string => `/ai/chats/${chatID}`,
  create: (): string => '/ai/chats',
  update: (chatID: string | number): string => `/ai/chats/${chatID}`,
  review: (chatID: string | number): string => `/ai/chats/${chatID}/review`,
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

export const updateChat = async (id: string | number, data: { title: string }): Promise<AiChatType> => {
  return (await api.patch<{ data: AiChatType }>(endpoint.update(id), data)).data.data;
};

/** Persists the user's decision on a diagram_diff / permission card. */
export const reviewCard = async (chatId: string | number, data: { id: string; decision: string }): Promise<void> => {
  await api.post(endpoint.review(chatId), data);
};

export const deleteChat = async (id: string | number): Promise<void> => {
  return await api.delete(endpoint.delete(id));
};
