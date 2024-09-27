import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ConfirmModalModel, ConfirmModalStore } from './types';

type ConfirmModalState = ConfirmModalStore;

const initialState: {
  isOpen: boolean;
  mode: ConfirmModalModel;
  title: string;
  description: string;
} = {
  isOpen: false,
  mode: 'success',
  title: '',
  description: ''
};

export const useConfirmModalStore = create<ConfirmModalState>()(
  immer((set, get) => ({
    ...initialState,
    open: () => set((state) => ({ ...state, isOpen: true })),
    close: () => set({ ...initialState }),
    show: (mode, title: string, description: string, onSuccess?: () => void, onCancel?: () => void) =>
      set((state) => ({
        ...state,
        isOpen: true,
        mode: mode,
        title,
        description,
        onCancel,
        onSuccess
      })),
    success: (title: string, description: string, onSuccess?: () => void, onCancel?: () => void) =>
      get().show('success', title, description, onSuccess, onCancel),
    danger: (title: string, description: string, onSuccess?: () => void, onCancel?: () => void) =>
      get().show('danger', title, description, onSuccess, onCancel),
    warning: (title: string, description: string, onSuccess?: () => void, onCancel?: () => void) =>
      get().show('warning', title, description, onSuccess, onCancel)
  }))
);
