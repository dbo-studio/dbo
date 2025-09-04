import type { AiChatType, AiContextType, AiMessageType, AiProviderType } from '@/types';

export type AIThread = {
  id: number;
  title: string;
  createdAt: number;
  messages: AiMessageType[];
};

export type AiProviderSlice = {
  providers: AiProviderType[] | undefined;
  updateProviders: (providers: AiProviderType[]) => Promise<void>;
  updateProvider: (provider: AiProviderType) => Promise<void>;
};

export type AiChatSlice = {
  chats: AiChatType[];
  currentChat: AiChatType | undefined;
  updateCurrentChat: (chat: AiChatType) => void;
  updateChats: (chats: AiChatType[]) => Promise<void>;
  addChat: (chat: AiChatType) => Promise<void>;
  addMessage: (chat: AiChatType, messages: AiMessageType[]) => AiChatType;
};

export type AiContextSlice = {
  context: AiContextType;
  updateContext: (context: AiContextType) => void;
};
