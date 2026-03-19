import type { AiProviderType } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiProviderSlice } from '../types';

export const createAiProviderSlice: StateCreator<
  AiProviderSlice,
  [['zustand/devtools', never]],
  [],
  AiProviderSlice
> = (set, get) => ({
  providers: undefined,
  updateProviders: (providers: AiProviderType[]) => {
    set({ providers }, undefined, 'updateProviders');
  },
  updateProvider: (provider: AiProviderType) => {
    const providers = get().providers ?? [];
    const updatedProviders = providers.map((p) => (p.id === provider.id ? provider : p));
    set({ providers: updatedProviders }, undefined, 'updateProvider');
  }
});
