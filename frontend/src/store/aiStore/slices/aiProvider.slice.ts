import type { AiProviderType } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiProviderSlice } from '../types';

export const createAiProviderSlice: StateCreator<AiProviderSlice, [], [], AiProviderSlice> = (set, get) => ({
  providers: undefined,
  currentProvider: undefined,
  currentModel: {},
  updateProviders: async (providers: AiProviderType[]) => {
    set({ providers });
  },
  updateProvider: async (provider: AiProviderType) => {
    const providers = get().providers ?? [];
    const updatedProviders = providers.map((p) => (p.id === provider.id ? provider : p));
    set({ providers: updatedProviders });
  },
  updateCurrentProvider: (provider: AiProviderType) => {
    set({ currentProvider: provider });
  },
  getCurrentModel: (provider: string) => {
    return get().currentModel[provider];
  },
  updateCurrentModel: (provider: string, model: string) => {
    set({ currentModel: { ...get().currentModel, [provider]: model } });
  }
});
