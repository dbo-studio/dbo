export type AIMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type AIProviderSettings = {
  providerId: 'openai-compatible';
  baseUrl?: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export type AIChatRequest = {
  connectionId: number;
  database?: string;
  schema?: string;
  threadId?: number;
  profileId?: number;
  messages: AIMessage[];
  provider?: AIProviderSettings;
};
export type AIChatResponse = { message: AIMessage };

export type AICompleteRequest = {
  connectionId: number;
  database?: string;
  schema?: string;
  prompt: string;
  suffix?: string;
  language?: string;
  provider?: AIProviderSettings;
};
export type AICompleteResponse = { completion: string };

import { api } from '@/core/api';

const endpoint = {
  chat: (): string => '/ai/chat',
  complete: (): string => '/ai/complete'
};

export const chat = async (data: AIChatRequest): Promise<AIChatResponse> => {
  return (await api.post(endpoint.chat(), data)).data.data as AIChatResponse;
};

export const complete = async (data: AICompleteRequest): Promise<AICompleteResponse> => {
  return (await api.post(endpoint.complete(), data)).data.data as AICompleteResponse;
};
