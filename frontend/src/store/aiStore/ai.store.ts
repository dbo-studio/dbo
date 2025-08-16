import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createAiProviderSlice } from './slices/aiProvider.slice';
import type { AiProviderSlice, AiStore } from './types';

type AiState = AiStore & AiProviderSlice;

export const useAiStore: UseBoundStore<StoreApi<AiState>> = create<AiState>()(
  devtools(
    persist(
      (set, get, ...state) => ({
        threads: [],
        currentThreadId: null,
        loadInitial: async () => {
          const [threadsApi] = await Promise.all([listThreads()]);
          const mapped: AIThread[] = threadsApi.map((t) => ({
            id: t.id,
            title: t.title,
            createdAt: Date.now(),
            messages: []
          }));
          set({ threads: mapped, currentThreadId: mapped[0] ? String(mapped[0].id) : null });
          if (mapped[0]) {
            const msgs = await listMessages(mapped[0].id);
            const messages = msgs.map((m) => ({ role: m.role, content: m.content }));
            const updated = get().threads.map((t) => (t.id === mapped[0]!.id ? { ...t, messages } : t));
            set({ threads: updated });
          }
        },
        newThread: async (title?: string) => {
          const t = await apiCreateThread(title ?? 'New Chat');
          const thread: AIThread = { id: t.id, title: t.title, createdAt: Date.now(), messages: [] };
          set({ threads: [thread, ...get().threads], currentThreadId: String(thread.id) });
          return thread.id;
        },
        selectThread: (id: number) => set({ currentThreadId: String(id) }),
        deleteThread: async (id: number) => {
          await apiDeleteThread(id);
          const threads = get().threads.filter((t) => t.id !== id);
          const currentThreadId =
            get().currentThreadId === String(id) ? (threads[0] ? String(threads[0].id) : null) : get().currentThreadId;
          set({ threads, currentThreadId });
        },
        addMessageToCurrent: async (m: AIMessage) => {
          let idStr = get().currentThreadId;
          let idNum: number;
          if (!idStr) {
            idNum = await get().newThread();
            idStr = String(idNum);
          } else {
            idNum = Number(idStr);
          }
          const threads = get().threads.map((t) => (t.id === idNum ? { ...t, messages: [...t.messages, m] } : t));
          set({ threads, currentThreadId: String(idNum) });
        },
        currentMessages: () => {
          const id = get().currentThreadId;
          if (!id) return [];
          return get().threads.find((t) => String(t.id) === id)?.messages ?? [];
        },
        ...createAiProviderSlice(set, get, ...state)
      }),
      { name: 'ai-settings' }
    ),
    { name: 'ai-store' }
  )
);
