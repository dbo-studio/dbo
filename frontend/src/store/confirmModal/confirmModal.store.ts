import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { ConfirmModalModel, ConfirmModalStore } from './types';

type ConfirmModalState = ConfirmModalStore;

const initialState: {
  isOpen: boolean;
  mode: ConfirmModalModel;
  title?: string | undefined;
  description?: string | undefined;
} = {
  isOpen: false,
  mode: 'success',
  title: undefined,
  description: undefined
};

export const useConfirmModalStore: UseBoundStore<StoreApi<ConfirmModalState>> = create<ConfirmModalState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      open: (): void => set((state) => ({ ...state, isOpen: true })),
      close: (): void => set({ ...initialState }),
      show: (
        mode: ConfirmModalModel,
        title?: string,
        description?: string,
        onSuccess?: () => void,
        onCancel?: () => void
      ): void =>
        set((state) => ({
          ...state,
          isOpen: true,
          mode: mode,
          title,
          description,
          onCancel,
          onSuccess
        })),
      success: (title?: string, description?: string, onSuccess?: () => void, onCancel?: () => void): void =>
        get().show('success', title, description, onSuccess, onCancel),
      danger: (title?: string, description?: string, onSuccess?: () => void, onCancel?: () => void): void =>
        get().show('danger', title, description, onSuccess, onCancel),
      warning: (title?: string, description?: string, onSuccess?: () => void, onCancel?: () => void): void =>
        get().show('warning', title, description, onSuccess, onCancel)
    }),
    { name: 'confirm_modal' }
  )
);
