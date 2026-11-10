import type React from 'react';

export type ModalSize = 'sm' | 'md' | 'lg';

export type ModalProps = {
  open: boolean;
  /** Width contract: sm 400 (confirm/prompt), md 512 (default form), lg 768 (wide/editor). */
  size?: ModalSize;
  title?: string;
  children: React.ReactNode;
  padding?: string;
  onClose?: () => void;
  disableEnforceFocus?: boolean;
  zIndex?: number;
};

export type ResizableModalProps = ModalProps & {
  onResize: (width: number, height: number) => void;
};
