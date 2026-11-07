import type React from 'react';

export type ModalProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  /** Action buttons, pinned to the bottom of the modal below the scrollable body. */
  footer?: React.ReactNode;
  padding?: string;
  /** Sizes the modal to its content instead of reserving room for a form (short prompts). */
  compact?: boolean;
  onClose?: () => void;
  disableEnforceFocus?: boolean;
  zIndex?: number;
};

export type ResizableModalProps = ModalProps & {
  onResize: (width: number, height: number) => void;
};
