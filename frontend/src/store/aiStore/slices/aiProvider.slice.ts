import type { AIProvider } from '@/types/AiProvider';
import type { StateCreator } from 'zustand';
import type { AiProviderSlice } from '../types';

export const createAiProviderSlice: StateCreator<AiProviderSlice, [], [], AiProviderSlice> = (set, get) => ({
  providers: undefined,
  currentProvider: undefined,
  currentModel: {},
  updateProviders: async (providers: AIProvider[]) => {
    set({ providers });
  },
  updateProvider: async (provider: AIProvider) => {
    const providers = get().providers ?? [];
    const updatedProviders = providers.map((p) => (p.id === provider.id ? provider : p));
    set({ providers: updatedProviders });
  },
  updateCurrentProvider: (provider: AIProvider) => {
    set({ currentProvider: provider });
  },
  getCurrentModel: (provider: string) => {
    return get().currentModel[provider];
  },
  updateCurrentModel: (provider: string, model: string) => {
    set({ currentModel: { ...get().currentModel, [provider]: model } });
  }
});
