import { api } from '@/core/api';
import type { AiChatType } from '@/types';
import type { CreateChatRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/chats',
  detail: (chatID: string | number): string => `/ai/chats/${chatID}`,
  create: (): string => '/ai/chats',
  update: (chatID: string | number): string => `/ai/chats/${chatID}`,
  delete: (chatID: string | number): string => `/ai/chats/${chatID}`
};

export const getChats = async (): Promise<AiChatType[]> => {
  return (await api.get(endpoint.list())).data.data as AiChatType[];
};

export const getChatDetail = async (id: string | number): Promise<AiChatType> => {
  return (await api.get(endpoint.detail(id))).data.data as AiChatType;
};

export const createChat = async (data: CreateChatRequestType): Promise<AiChatType> => {
  return (await api.post(endpoint.create(), data)).data.data as AiChatType;
};

export const deleteChat = async (id: string | number): Promise<AiChatType[]> => {
  return (await api.delete(endpoint.delete(id))).data.data as AiChatType[];
};
