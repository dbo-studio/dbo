import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createAiChatSlice } from './slices/aiChat.slice';
import { createAiContextSlice } from './slices/aiContext.slice';
import { createAiProviderSlice } from './slices/aiProvider.slice';
import type { AiChatSlice, AiContextSlice, AiProviderSlice, AiStore } from './types';

type AiState = AiStore & AiProviderSlice & AiChatSlice & AiContextSlice;

export const useAiStore: UseBoundStore<StoreApi<AiState>> = create<AiState>()(
  devtools(
    (set, get, ...state) => ({
      ...createAiChatSlice(set, get, ...state),
      ...createAiContextSlice(set, get, ...state),
      ...createAiProviderSlice(set, get, ...state)
    }),
    { name: 'ai' }
  )
);
