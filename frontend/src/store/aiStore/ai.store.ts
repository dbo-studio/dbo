import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createAiBridgeSlice } from './slices/aiBridge.slice';
import { createAiChatSlice } from './slices/aiChat.slice';
import { createAiContextSlice } from './slices/aiContext.slice';
import { createAiProviderSlice } from './slices/aiProvider.slice';
import { createAiStreamingSlice } from './slices/aiStreaming.slice';
import { createAiToolSlice } from './slices/aiTool.slice';
import type {
  AiBridgeSlice,
  AiChatSlice,
  AiContextSlice,
  AiProviderSlice,
  AiStreamingSlice,
  AiToolSlice
} from './types';

type AiState = AiProviderSlice & AiChatSlice & AiContextSlice & AiStreamingSlice & AiBridgeSlice & AiToolSlice;

export const useAiStore: UseBoundStore<StoreApi<AiState>> = create<AiState>()(
  devtools(
    (set, get, ...state) => ({
      ...createAiChatSlice(set, get, ...state),
      ...createAiContextSlice(set, get, ...state),
      ...createAiProviderSlice(set, get, ...state),
      ...createAiStreamingSlice(set, get, ...state),
      ...createAiBridgeSlice(set, get, ...state),
      ...createAiToolSlice(set, get, ...state)
    }),
    { name: 'ai' }
  )
);
