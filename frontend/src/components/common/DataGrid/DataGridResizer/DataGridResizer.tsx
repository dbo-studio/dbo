import type React from 'react';
import type { JSX } from 'react';
import { Resizer } from '../DataGrid.styled';
import type { DataGridResizerProps } from '../types';

export default function DataGridResizer({ columnId, isResizing, onResizeStart }: DataGridResizerProps): JSX.Element {
  if (columnId === 'select') return <></>;

  const handleMouseDown = (e: React.MouseEvent): void => {
    onResizeStart(columnId, e);
  };

  const handleTouchStart = (e: React.TouchEvent): void => {
    onResizeStart(columnId, e);
  };

  return (
    <Resizer
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`resizer ${isResizing ? 'isResizing' : ''}`}
    />
  );
}
