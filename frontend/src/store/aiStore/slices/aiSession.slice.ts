import type { AiChatRequest } from '@/api/ai/types';
import type { StateCreator } from 'zustand';
import type { AiStreamingSlice } from '../types';

const initialStreamingState = {
  status: 'idle' as const,
  phase: 'context' as const,
  statusLabel: undefined,
  thinkingContent: '',
  thinkingStartedAt: undefined,
  thinkingDurationMs: undefined,
  previewContent: '',
  activeBlockType: undefined,
  error: undefined,
  lastRequest: undefined
};

export const createAiStreamingSlice: StateCreator<
  AiStreamingSlice,
  [['zustand/devtools', never]],
  [],
  AiStreamingSlice
> = (set) => ({
  streaming: { ...initialStreamingState },
  resetStreaming: () => {
    set({ streaming: { ...initialStreamingState } }, undefined, 'resetStreaming');
  },
  setStreamingStatus: (status) => {
    set(
      (state) => ({
        streaming: { ...state.streaming, status }
      }),
      undefined,
      'setStreamingStatus'
    );
  },
  updateStreaming: (partial) => {
    set(
      (state) => ({
        streaming: { ...state.streaming, ...partial }
      }),
      undefined,
      'updateStreaming'
    );
  },
  setLastRequest: (request: AiChatRequest | undefined) => {
    set(
      (state) => ({
        streaming: { ...state.streaming, lastRequest: request }
      }),
      undefined,
      'setLastRequest'
    );
  }
});
