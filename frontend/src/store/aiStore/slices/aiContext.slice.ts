import type { AiContextType } from '@/types';
import type { StateCreator } from 'zustand';
import type { AiContextSlice, AiState } from '../types';

export const createAiContextSlice: StateCreator<AiState, [['zustand/devtools', never]], [], AiContextSlice> = (
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
  editingUserAt: null,
  editingDraft: '',
  autoContext: true,
  setAutoContext: (autoContext: boolean) => {
    set({ autoContext }, undefined, 'setAutoContext');
  },
  updateContext: (context: AiContextType) => {
    set({ context }, undefined, 'updateContext');
  },
  beginMessageEdit: (createdAt, content): void => {
    set({ editingUserAt: createdAt, editingDraft: content }, undefined, 'beginMessageEdit');
  },
  setEditingDraft: (editingDraft): void => {
    set({ editingDraft }, undefined, 'setEditingDraft');
  },
  endMessageEdit: (): void => {
    if (get().editingUserAt === null) return;
    set({ editingUserAt: null, editingDraft: '' }, undefined, 'endMessageEdit');
  },
  cancelMessageEdit: (): void => {
    if (get().editingUserAt === null) return;
    set({ editingUserAt: null, editingDraft: '' }, undefined, 'cancelMessageEdit');
  }
});
