import type { EventFor } from '@/types';
import { type JSX, useCallback, useEffect, useRef, useState } from 'react';
import { ResizableXBoxStyled } from './ResizableXBox.styled';
import ResizableToggle from './ResizableToggle';
import type { ResizableBoxXProps } from './types';

export default function ResizableXBox({
  direction,
  width,
  maxWidth,
  children,
  onChange
}: ResizableBoxXProps): JSX.Element {
  const [boxWidth, setBoxWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);
  const [initialX, setInitialX] = useState(0);
  const currentWidthRef = useRef(boxWidth);

  currentWidthRef.current = boxWidth;

  const handleMouseDown = (event: EventFor<'div', 'onMouseDown'>): void => {
    event.preventDefault();
    setIsResizing(true);
    setInitialX(event.clientX);
  };

  const handleMouseUp = useCallback((): void => {
    if (!isResizing) return;

    if (onChange) {
      const finalWidth = currentWidthRef.current;
      if (maxWidth && finalWidth > maxWidth) {
        onChange(maxWidth);
      } else {
        onChange(finalWidth);
      }
    }
    setIsResizing(false);
  }, [isResizing, maxWidth, onChange]);

  const handleMouseMove = useCallback(
    (event: MouseEvent): void => {
      if (!isResizing) return;

      const newWidth =
        direction === 'ltr'
          ? Math.max(boxWidth - (event.clientX - initialX), 50)
          : Math.max(boxWidth + (event.clientX - initialX), 50);

      if (maxWidth && newWidth > maxWidth) return;

      setBoxWidth(newWidth);
      currentWidthRef.current = newWidth;

      setInitialX(event.clientX);
    },
    [boxWidth, direction, initialX, isResizing, maxWidth]
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
    <ResizableXBoxStyled boxWidth={boxWidth}>
      <ResizableToggle onMouseDown={handleMouseDown} direction={direction} />
      {children}
    </ResizableXBoxStyled>
  );
}
