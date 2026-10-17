import type { ReactNode } from 'react';
import type { IconTypes } from '@/components/base/CustomIcon/types';

export type EmptyStateProps = {
  icon?: keyof typeof IconTypes;
  title: string;
  description?: string;
  action?: ReactNode;
};
