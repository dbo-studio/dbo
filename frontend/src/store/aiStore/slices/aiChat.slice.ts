import type { AiChatType, AiMessageType } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiChatSlice } from '../types';

export const createAiChatSlice: StateCreator<AiChatSlice, [], [], AiChatSlice> = (set, get) => ({
    chats: [],
    currentChat: undefined,
    updateCurrentChat: (chat: AiChatType) => {
        set({ currentChat: chat });
    },
    updateChats: async (chats: AiChatType[]) => {
        set({ chats });
    },
    addChat: async (chat: AiChatType) => {
        set({ chats: [...get().chats, chat] });
    },
    addMessage: async (chatId: number, message: AiMessageType) => {
        const chats = get().chats;
        const updatedChats = chats.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, message] } : c));
        set({ chats: updatedChats });
    }
});
