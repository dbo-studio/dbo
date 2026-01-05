import type { AiChatType, AiMessageType } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiChatSlice } from '../types';

export const createAiChatSlice: StateCreator<AiChatSlice, [], [], AiChatSlice> = (set, get) => ({
  chats: [],
  currentChat: undefined,
  updateCurrentChat: (chat: AiChatType) => {
    const chats = get().chats;
    const updatedChats = chats.map((c) => (c.id === chat.id ? chat : c));
    set({ chats: updatedChats, currentChat: chat });
  },
  updateChats: async (chats: AiChatType[]) => {
    set({ chats });
  },
  addChat: async (chat: AiChatType) => {
    set({ chats: [chat, ...get().chats] });
  },
  addMessage: (chat: AiChatType, messages: AiMessageType[]): AiChatType => {
    for (const message of messages) {
      message.isNew = true;
    }

    const updatedChat = { ...chat, messages: [...(chat.messages ?? []), ...messages] };

    get().updateCurrentChat(updatedChat);

    return updatedChat;
  }
});
