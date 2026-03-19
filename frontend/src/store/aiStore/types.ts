import type { AiChatType, AiContextType, AiMessageType, AiProviderType } from '@/types';

export type AIThread = {
  id: number;
  title: string;
  createdAt: number;
  messages: AiMessageType[];
};

export type AiProviderSlice = {
  providers: AiProviderType[] | undefined;
  updateProviders: (providers: AiProviderType[]) => void;
  updateProvider: (provider: AiProviderType) => void;
};

export type AiChatSlice = {
  chats: AiChatType[];
  currentChat: AiChatType | undefined;
  updateCurrentChat: (chat: AiChatType | undefined) => void;
  updateChats: (chats: AiChatType[]) => void;
  addChat: (chat: AiChatType) => void;
  addMessage: (chat: AiChatType, messages: AiMessageType[]) => AiChatType;
};

export type AiContextSlice = {
  context: AiContextType;
  messageEdit: boolean;
  toggleMessageEdit: () => void;
  updateContext: (context: AiContextType) => void;
};
