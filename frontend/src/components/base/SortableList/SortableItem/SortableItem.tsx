import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box } from '@mui/material';
import type { JSX } from 'react';
import { memo, useCallback, useRef } from 'react';
import { SortableItemProps } from '../types';

function SortableItem({ id, children, className, onClick, disabled = false }: SortableItemProps): JSX.Element {
  const hasMovedRef = useRef<boolean>(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled
  });

  const style = {
    transform: transform
      ? CSS.Transform.toString({
          ...transform,
          y: transform.y ?? 0,
          x: transform.x ?? 0
        })
      : undefined,
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab'
  };

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

  if (isDragging) {
    hasMovedRef.current = true;
  } else if (!isDragging && hasMovedRef.current) {
    hasMovedRef.current = false;
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      className={className}
      onClick={handleClick}
      sx={{
        userSelect: 'none',
        touchAction: 'none',
        willChange: 'transform',
        position: 'relative'
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </Box>
  );
}

SortableItem.displayName = 'SortableItem';

export default memo(SortableItem);
