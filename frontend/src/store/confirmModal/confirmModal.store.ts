import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { ConfirmModalModel, ConfirmModalStore } from './types';

type ConfirmModalState = ConfirmModalStore;

const initialState: {
  isOpen: boolean;
  mode: ConfirmModalModel;
  title?: string | undefined;
  description?: string | undefined;
  confirmLabel?: string | undefined;
} = {
  isOpen: false,
  mode: 'success',
  title: undefined,
  description: undefined,
  confirmLabel: undefined
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
        onCancel?: () => void,
        confirmLabel?: string
      ): void =>
        set((state) => ({
          ...state,
          isOpen: true,
          mode: mode,
          title,
          description,
          confirmLabel,
          onCancel,
          onSuccess
        })),
      success: (
        title?: string,
        description?: string,
        onSuccess?: () => void,
        onCancel?: () => void,
        confirmLabel?: string
      ): void => get().show('success', title, description, onSuccess, onCancel, confirmLabel),
      danger: (
        title?: string,
        description?: string,
        onSuccess?: () => void,
        onCancel?: () => void,
        confirmLabel?: string
      ): void => get().show('danger', title, description, onSuccess, onCancel, confirmLabel),
      warning: (
        title?: string,
        description?: string,
        onSuccess?: () => void,
        onCancel?: () => void,
        confirmLabel?: string
      ): void => get().show('warning', title, description, onSuccess, onCancel, confirmLabel)
    }),
    { name: 'confirm_modal' }
  )
);
