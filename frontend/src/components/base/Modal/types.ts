import type React from 'react';

export type ModalProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  padding?: string;
  onClose?: () => void;
};

export type ResizableModalProps = ModalProps & {
  onResize: (width: number, height: number) => void;
};
