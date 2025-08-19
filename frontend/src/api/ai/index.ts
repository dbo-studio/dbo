import { api } from '@/core/api';
import type { AiChatRequest, AICompleteRequest, AICompleteResponse, AiChatResponse } from './types';

const endpoint = {
  chat: (): string => '/ai/chat',
  complete: (): string => '/ai/complete'
};

export const chat = async (data: AiChatRequest): Promise<AiChatResponse> => {
  return (await api.post(endpoint.chat(), data)).data.data as AiChatResponse;
};

export const complete = async (data: AICompleteRequest): Promise<AICompleteResponse> => {
  return (await api.post(endpoint.complete(), data)).data.data as AICompleteResponse;
};
