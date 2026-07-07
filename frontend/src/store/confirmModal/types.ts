export type ConfirmModalStore = {
  isOpen: boolean;
  mode: ConfirmModalModel;
  title?: string | undefined;
  description?: string | undefined;
  confirmLabel?: string | undefined;
  onCancel?: () => void;
  onSuccess?: () => void;
  open: () => void;
  close: () => void;
  show: (
    mode: ConfirmModalModel,
    title?: string,
    description?: string,
    onSuccess?: () => void,
    onCancel?: () => void,
    confirmLabel?: string
  ) => void;
  success: (
    title?: string,
    description?: string,
    onSuccess?: () => void,
    onCancel?: () => void,
    confirmLabel?: string
  ) => void;
  danger: (
    title?: string,
    description?: string,
    onSuccess?: () => void,
    onCancel?: () => void,
    confirmLabel?: string
  ) => void;
  warning: (
    title?: string,
    description?: string,
    onSuccess?: () => void,
    onCancel?: () => void,
    confirmLabel?: string
  ) => void;
};

export type ConfirmModalModel = 'success' | 'danger' | 'warning';
