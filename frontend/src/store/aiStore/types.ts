import type { AiChatType, AiContextType, AiMessageType, AiProviderType } from '@/types';

export type AIThread = {
  id: number;
  title: string;
  createdAt: number;
  messages: AiMessageType[];
};

export type AiStore = {};

export type AiProviderSlice = {
  providers: AiProviderType[] | undefined;
  currentProvider: AiProviderType | undefined;
  currentModel: Record<string, string>;
  updateCurrentProvider: (provider: AiProviderType) => void;
  updateProviders: (providers: AiProviderType[]) => Promise<void>;
  updateProvider: (provider: AiProviderType) => Promise<void>;
  getCurrentModel: (provider: string) => string | undefined;
  updateCurrentModel: (provider: string, model: string) => void;
};

export type AiChatSlice = {
  chats: AiChatType[];
  currentChat: AiChatType | undefined;
  updateCurrentChat: (chat: AiChatType) => void;
  updateChats: (chats: AiChatType[]) => Promise<void>;
  addChat: (chat: AiChatType) => Promise<void>;
  addMessage: (chatId: number, message: AiMessageType) => Promise<void>;
};

export type AiContextSlice = {
  context: AiContextType;
  updateContext: (context: AiContextType) => void;
};