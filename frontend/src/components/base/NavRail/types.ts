import type { IconTypes } from '@/components/base/CustomIcon/types';
import type { KeyboardEvent, ReactNode, Ref } from 'react';

export type NavRailProps = {
  children: ReactNode;
  hideOnMobile?: boolean;
  /** Fill the container instead of the fixed rail width (compact layouts). */
  fullWidth?: boolean;
  role?: string;
  'aria-label'?: string;
};

export type NavRailItemProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: keyof typeof IconTypes;
  role?: 'button' | 'tab';
  testId?: string;
  tabIndex?: number;
  ref?: Ref<HTMLDivElement>;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};
