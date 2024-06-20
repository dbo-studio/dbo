import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ConfirmModalStore } from './types';

type ConfirmModalState = ConfirmModalStore;

const initialState = {
  isOpen: false,
  title: '',
  description: ''
};

export const useConfirmModalStore = create<ConfirmModalState>()(
  immer((set) => ({
    ...initialState,
    open: () => set((state) => ({ ...state, isOpen: true })),
    close: () => set({ ...initialState }),
    show: (title: string, description: string, onSuccess?: () => void, onCancel?: () => void) =>
      set((state) => ({
        ...state,
        isOpen: true,
        title,
        description,
        onCancel,
        onSuccess
      }))
  }))
);
