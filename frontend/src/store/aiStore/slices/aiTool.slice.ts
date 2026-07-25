import type { StateCreator } from 'zustand';
import type { AiToolSlice } from '../types';

export const createAiToolSlice: StateCreator<AiToolSlice, [['zustand/devtools', never]], [], AiToolSlice> = (set) => ({
  toolSteps: [],
  appendToolStep: (step) => {
    set((state) => ({ toolSteps: [...state.toolSteps, step] }), undefined, 'appendToolStep');
  },
  updateToolStep: (id, partial) => {
    set(
      (state) => ({
        toolSteps: state.toolSteps.map((s) => (s.id === id ? { ...s, ...partial } : s))
      }),
      undefined,
      'updateToolStep'
    );
  },
  clearToolSteps: () => {
    set({ toolSteps: [] }, undefined, 'clearToolSteps');
  }
});
