import type { ReactNode } from 'react';

export type ListRowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  selected?: boolean;
  onClick?: () => void;
  /** Long-press on touch devices fires `contextmenu`, so this doubles as the long-press handler. */
  onLongPress?: () => void;
  testId?: string;
};
