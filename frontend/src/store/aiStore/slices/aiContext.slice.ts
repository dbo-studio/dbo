import type { AiContextType } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiContextSlice } from '../types';

export const createAiContextSlice: StateCreator<AiContextSlice, [], [], AiContextSlice> = (set, get) => ({
  context: {
    input: '',
    database: undefined,
    schema: undefined,
    tables: [],
    views: []
  },
  updateContext: (context: AiContextType) => {
    set({ context });
  }
});
