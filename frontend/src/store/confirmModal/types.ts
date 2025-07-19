export type ConfirmModalStore = {
  isOpen: boolean;
  mode: ConfirmModalModel;
  title?: string | undefined;
  description?: string | undefined;
  onCancel?: () => void;
  onSuccess?: () => void;
  open: () => void;
  close: () => void;
  show: (
    mode: ConfirmModalModel,
    title?: string | undefined,
    description?: string | undefined,
    onSuccess?: () => void,
    onCancel?: () => void
  ) => void;
  success: (
    title?: string | undefined,
    description?: string | undefined,
    onSuccess?: () => void,
    onCancel?: () => void
  ) => void;
  danger: (
    title?: string | undefined,
    description?: string | undefined,
    onSuccess?: () => void,
    onCancel?: () => void
  ) => void;
  warning: (
    title?: string | undefined,
    description?: string | undefined,
    onSuccess?: () => void,
    onCancel?: () => void
  ) => void;
};

export type ConfirmModalModel = 'success' | 'danger' | 'warning';
