import type React from 'react';
import { Resizer } from '../TestGrid.styled';

interface CustomResizerProps {
  columnId: string;
  isResizing: boolean;
  onResizeStart: (columnId: string, event: React.MouseEvent | React.TouchEvent) => void;
}

export const CustomResizer: React.FC<CustomResizerProps> = ({ columnId, isResizing, onResizeStart }) => {
  // Skip rendering for checkbox column
  if (columnId === 'select') return null;

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
};
