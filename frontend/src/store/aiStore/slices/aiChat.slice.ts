import type { AiChatType, AiMessageType } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiChatSlice } from '../types';

export const createAiChatSlice: StateCreator<AiChatSlice, [['zustand/devtools', never]], [], AiChatSlice> = (
  set,
  get
) => ({
  chats: [],
  currentChat: undefined,
  updateCurrentChat: (chat: AiChatType | undefined) => {
    if (chat) {
      const chats = get().chats;
      const updatedChats = chats.map((c) => (c.id === chat.id ? chat : c));
      set({ chats: updatedChats, currentChat: chat }, undefined, 'updateCurrentChat');
      return;
    }
    set({ currentChat: undefined }, undefined, 'updateCurrentChat');
  },
  updateChats: (chats: AiChatType[]) => {
    set({ chats });
  },
  addChat: (chat: AiChatType) => {
    set({ chats: [...get().chats, chat] }, undefined, 'addChat');
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
