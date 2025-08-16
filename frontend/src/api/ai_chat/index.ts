import { api } from '@/core/api';
import type { AIChat } from '@/types/AiChat';
import type { CreateChatRequestType } from './types';

const endpoint = {
  list: (): string => '/ai/chats',
  detail: (chatID: string | number): string => `/ai/chats/${chatID}`,
  create: (): string => '/ai/chats',
  update: (chatID: string | number): string => `/ai/chats/${chatID}`,
  delete: (chatID: string | number): string => `/ai/chats/${chatID}`
};

export const getChats = async (): Promise<AIChat[]> => {
  return (await api.get(endpoint.list())).data.data as AIChat[];
};

export const getChatDetail = async (id: string | number): Promise<AIChat> => {
  return (await api.get(endpoint.detail(id))).data.data as AIChat;
};

export const createChat = async (data: CreateChatRequestType): Promise<AIChat> => {
  return (await api.post(endpoint.create(), data)).data.data as AIChat;
};

export const deleteChat = async (id: string | number): Promise<AIChat[]> => {
  return (await api.delete(endpoint.delete(id))).data.data as AIChat[];
};
