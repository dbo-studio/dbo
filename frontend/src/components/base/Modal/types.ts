import type React from 'react';

export type ModalProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  /** Action buttons, pinned to the bottom of the modal below the scrollable body. */
  footer?: React.ReactNode;
  padding?: string;
  onClose?: () => void;
  disableEnforceFocus?: boolean;
  zIndex?: number;
};

export type ResizableModalProps = ModalProps & {
  onResize: (width: number, height: number) => void;
};
