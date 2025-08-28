import type { AiMessageType } from '@/types';

export type AiContextOptsType = {
  query?: string;
  database?: string;
  schema?: string;
  tables?: string[];
  views?: string[];
};

export type AiChatRequest = {
  connectionId: number;
  providerId: number;
  chatId?: number;
  model: string;
  message: string;
  contextOpts?: AiContextOptsType;
};
export type AiChatResponse = {
  chatId: number;
  title: string;
  messages: AiMessageType[];
};

export type AICompleteRequest = {
  connectionId: number;
  database?: string;
  schema?: string;
  prompt: string;
  suffix?: string;
  language?: string;
  provider?: any;
};

export type AICompleteResponse = { completion: string };
