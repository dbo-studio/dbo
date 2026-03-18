import { api } from '@/core/api';
import type { AICompleteRequest, AICompleteResponse, AiChatRequest, AiChatResponse } from './types';

const endpoint = {
  chat: (): string => '/ai/chat',
  complete: (): string => '/ai/complete'
};

export const chat = async (data: AiChatRequest): Promise<AiChatResponse> => {
  return (await api.post<{ data: AiChatResponse }>(endpoint.chat(), data)).data.data;
};

export const complete = async (data: AICompleteRequest, signal?: AbortSignal): Promise<AICompleteResponse> => {
  return (await api.post<{ data: AICompleteResponse }>(endpoint.complete(), data, { signal })).data.data;
};
