import type { EventFor } from '@/types';
import { Box } from '@mui/material';
import { type JSX, useEffect, useRef, useState } from 'react';
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

  const handleMouseDown = (event: EventFor<'div', 'onMouseDown'>): void => {
    event.preventDefault();
    setIsResizing(true);
    setInitialX(event.clientX);
  };

  const handleMouseUp = (): void => {
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
  };

  const handleMouseMove = (event: MouseEvent): void => {
    if (!isResizing) return;

    const newWidth =
      direction === 'ltr'
        ? Math.max(boxWidth - (event.clientX - initialX), 50)
        : Math.max(boxWidth + (event.clientX - initialX), 50);

    if (maxWidth && newWidth > maxWidth) return;

    setBoxWidth(newWidth);
    currentWidthRef.current = newWidth;

    setInitialX(event.clientX);
  };

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
  }, [isResizing]);

  return (
    <Box position={'relative'} overflow={'hidden'} width={boxWidth}>
      <ResizableToggle onMouseDown={handleMouseDown} direction={direction} />
      {children}
    </Box>
  );
}
