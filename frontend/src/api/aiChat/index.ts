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
  return (await api.get(endpoint.list(), { params })).data.data as AiChatType[];
};

export const getChatDetail = async (params: AiChatDetailRequestType): Promise<AiChatType> => {
  return (
    await api.get(endpoint.detail(params.id), {
      params: {
        page: params.page,
        count: params.count
      }
    })
  ).data.data as AiChatType;
};

export const createChat = async (data: CreateChatRequestType): Promise<AiChatType> => {
  return (await api.post(endpoint.create(), data)).data.data as AiChatType;
};

export const deleteChat = async (id: string | number): Promise<void> => {
  return await api.delete(endpoint.delete(id));
};
