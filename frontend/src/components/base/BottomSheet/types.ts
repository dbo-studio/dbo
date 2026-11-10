import type { ReactNode } from 'react';

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions?: ReactNode;
  /** Take the full viewport height instead of sizing to content. */
  fullHeight?: boolean;
  children: ReactNode;
};

export type BottomSheetStyledProps = {
  fullHeight?: boolean;
};
