'use no memo';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { SortableItemProps } from '../types';
import { SortableItemStyled } from './SortableItem.styled';

function SortableItem({
  id,
  children,
  className,
  onClick,
  disabled = false,
  direction
}: SortableItemProps): JSX.Element {
  const hasMovedRef = useRef<boolean>(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled
  });

  const style = {
    transform:
      isDragging || !transform
        ? undefined
        : CSS.Transform.toString({
            ...transform,
            x: direction === 'vertical' ? 0 : (transform.x ?? 0),
            y: direction === 'horizontal' ? 0 : (transform.y ?? 0)
          }),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'pointer'
  };

  const handleClickCapture = useCallback(
    (e: React.MouseEvent): void => {
      if (hasMovedRef.current || isDragging || disabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [isDragging, disabled]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent): void => {
      if (hasMovedRef.current || isDragging || disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.(e);
    },
    [onClick, isDragging, disabled]
  );

  useEffect(() => {
    if (isDragging) {
      hasMovedRef.current = true;
    } else if (hasMovedRef.current) {
      hasMovedRef.current = false;
    }
  }, [isDragging]);

  return (
    <SortableItemStyled
      ref={setNodeRef}
      direction={direction}
      style={style}
      className={className}
      onClickCapture={handleClickCapture}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {children}
    </SortableItemStyled>
  );
}

SortableItem.displayName = 'SortableItem';

export default SortableItem;
