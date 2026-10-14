import type { ReactNode } from 'react';

export type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
};
