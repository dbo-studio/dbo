export type ConfirmModalStore = {
  isOpen: boolean;
  mode: ConfirmModalModel;
  title: string;
  description: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  open: () => void;
  close: () => void;
  show: (
    mode: ConfirmModalModel,
    title: string,
    description: string,
    onSuccess?: () => void,
    onCancel?: () => void
  ) => void;
  success: (title: string, description: string, onSuccess?: () => void, onCancel?: () => void) => void;
  danger: (title: string, description: string, onSuccess?: () => void, onCancel?: () => void) => void;
  warning: (title: string, description: string, onSuccess?: () => void, onCancel?: () => void) => void;
};

export type ConfirmModalModel = 'success' | 'danger' | 'warning';
