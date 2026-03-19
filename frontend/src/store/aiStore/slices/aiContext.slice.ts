import type { AiContextType } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiContextSlice } from '../types';

export const createAiContextSlice: StateCreator<AiContextSlice, [['zustand/devtools', never]], [], AiContextSlice> = (
  set,
  get
) => ({
  context: {
    input: '',
    database: undefined,
    schema: undefined,
    tables: [],
    views: []
  },
  messageEdit: false,
  updateContext: (context: AiContextType) => {
    set({ context }, undefined, 'updateContext');
  },
  toggleMessageEdit: (): void => {
    set({ messageEdit: !get().messageEdit }, undefined, 'toggleMessageEdit');
  }
});
