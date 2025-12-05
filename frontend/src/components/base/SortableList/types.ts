import type { DragEndEvent } from '@dnd-kit/core';
import type { ReactNode } from 'react';

export type SortableDirection = 'horizontal' | 'vertical';

export type SortableListProps<T> = {
  items: T[];
  onReorder: (activeId: string, overId: string) => void;
  renderItem: (item: T, index: number) => ReactNode;
  getItemId: (item: T) => string;
  direction?: SortableDirection;
  activationDistance?: number;
  className?: string;
  onDragStart?: () => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragCancel?: () => void;
};

export type SortableItemProps = {
  id: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
};
