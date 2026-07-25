import type { AiChatRequest } from './types';

export const normalizeAiChatRequest = (data: AiChatRequest): AiChatRequest => ({
  ...data,
  connectionId: Number(data.connectionId),
  ...(data.chatId != null ? { chatId: Number(data.chatId) } : {}),
  contextOpts: data.contextOpts
    ? {
        ...data.contextOpts,
        ...(data.contextOpts.database != null ? { database: String(data.contextOpts.database) } : {}),
        ...(data.contextOpts.schema != null ? { schema: String(data.contextOpts.schema) } : {})
      }
    : undefined
});
