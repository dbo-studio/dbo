import type { EventFor } from '@/types';
import { type JSX, useCallback, useEffect, useRef, useState } from 'react';
import { ResizableYBoxStyled } from './ResizableYBox.styled';
import ResizableToggle from './ResizableToggle';
import type { ResizableBoxYProps } from './types';

export default function ResizableYBox({
  direction,
  height,
  maxHeight,
  children,
  onChange
}: ResizableBoxYProps): JSX.Element {
  const [boxHeight, setBoxHeight] = useState(height);
  const [isResizing, setIsResizing] = useState(false);
  const [initialY, setInitialY] = useState(0);
  const currentHeightRef = useRef(boxHeight);

  currentHeightRef.current = boxHeight;

  const handleMouseDown = (event: EventFor<'div', 'onMouseDown'>): void => {
    event.preventDefault();
    setIsResizing(true);
    setInitialY(event.clientY);
  };

  const handleMouseUp = useCallback((): void => {
    if (!isResizing) return;
    if (onChange) {
      const finalHeight = currentHeightRef.current;
      if (maxHeight && finalHeight > maxHeight) {
        onChange(maxHeight);
      } else {
        onChange(finalHeight);
      }
    }
    setIsResizing(false);
  }, [isResizing, maxHeight, onChange]);

  const handleMouseMove = useCallback(
    (event: MouseEvent): void => {
      if (!isResizing) return;

      const newHeight =
        direction === 'ttb'
          ? Math.max(boxHeight + (event.clientY - initialY), 50)
          : Math.max(boxHeight - (event.clientY - initialY), 50);

      if (maxHeight && newHeight > maxHeight) return;

      setBoxHeight(newHeight);
      currentHeightRef.current = newHeight;
      setInitialY(event.clientY);
    },
    [boxHeight, direction, initialY, isResizing, maxHeight]
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isResizing]);

  return (
    <ResizableYBoxStyled boxHeight={boxHeight}>
      <ResizableToggle onMouseDown={handleMouseDown} direction={direction} />
      {children}
    </ResizableYBoxStyled>
  );
}
