import { api } from '@/core/api';
import type { AiChatType } from '@/types';
import type { AiChatDetailRequestType, AiChatRequestType, CreateChatRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/chats',
  detail: (chatID: string | number): string => `/ai/chats/${chatID}`,
  create: (): string => '/ai/chats',
  update: (chatID: string | number): string => `/ai/chats/${chatID}`,
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

export const deleteChat = async (id: string | number): Promise<void> => {
  return await api.delete(endpoint.delete(id));
};
