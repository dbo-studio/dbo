import { api } from '@/core/api';
import type { AICompleteRequest, AICompleteResponse, AiChatRequest, AiChatResponse } from './types';

const endpoint = {
  chat: (): string => '/ai/chat',
  complete: (): string => '/ai/complete'
};

export const chat = async (data: AiChatRequest): Promise<AiChatResponse> => {
  return (await api.post(endpoint.chat(), data)).data.data as AiChatResponse;
};

export const complete = async (data: AICompleteRequest, signal?: AbortSignal): Promise<AICompleteResponse> => {
  return (await api.post(endpoint.complete(), data, { signal })).data.data as AICompleteResponse;
};
