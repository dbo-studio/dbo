import type React from 'react';

export type ModalSize = 'sm' | 'md' | 'lg';

export type ModalProps = {
  open: boolean;
  /** Width contract: sm 400 (confirm/prompt), md 512 (default form), lg 768 (wide/editor). */
  size?: ModalSize;
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
