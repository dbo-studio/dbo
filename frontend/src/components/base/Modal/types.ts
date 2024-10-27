import type React from 'react';

export type ModalProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  padding?: string;
  onClose?: () => void;
};
