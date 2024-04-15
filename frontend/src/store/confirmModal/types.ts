export type ConfirmModalStore = {
  isOpen: boolean;
  title: string;
  description: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  open: () => void;
  close: () => void;
  show: (title: string, description: string, onSuccess?: () => void, onCancel?: () => void) => void;
};
