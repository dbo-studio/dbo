import type { AiState } from './types';

export const editingDraftOf = (state: AiState): string => state.editingDraft;
export const setEditingDraftOf = (state: AiState): ((draft: string) => void) => state.setEditingDraft;
export const cancelMessageEditOf = (state: AiState): (() => void) => state.cancelMessageEdit;
