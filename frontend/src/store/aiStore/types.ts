import type { AIMessage } from '@/api/ai';
import type { AIProvider } from '@/types/AiProvider';

export type AIThread = {
  id: number;
  title: string;
  createdAt: number;
  messages: AIMessage[];
};

export type AiStore = {
  threads: AIThread[];
  currentThreadId: string | null;
  newThread: (title?: string) => Promise<number>;
  selectThread: (id: number) => void;
  deleteThread: (id: number) => Promise<void>;
  addMessageToCurrent: (m: AIMessage) => Promise<void>;
  currentMessages: () => AIMessage[];
};

export type AiProviderSlice = {
  providers: AIProvider[] | undefined;
  currentProvider: AIProvider | undefined;
  currentModel: Record<string, string>;
  updateCurrentProvider: (provider: AIProvider) => void;
  updateProviders: (providers: AIProvider[]) => Promise<void>;
  updateProvider: (provider: AIProvider) => Promise<void>;
  getCurrentModel: (provider: string) => string | undefined;
  updateCurrentModel: (provider: string, model: string) => void;
};
