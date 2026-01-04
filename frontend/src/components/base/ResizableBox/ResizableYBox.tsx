import type { EventFor } from '@/types';
import { Box } from '@mui/material';
import { type JSX, useEffect, useRef, useState } from 'react';
import ResizableToggle from './ResizableToggle';
import type { ResizableBoxYProps } from './types';

export default function ResizableYBox(props: ResizableBoxYProps): JSX.Element {
  const [boxHeight, setBoxHeight] = useState(props.height);
  const [isResizing, setIsResizing] = useState(false);
  const [initialY, setInitialY] = useState(0);
  const currentHeightRef = useRef(boxHeight);

  const handleMouseDown = (event: EventFor<'div', 'onMouseDown'>): void => {
    event.preventDefault();
    setIsResizing(true);
    setInitialY(event.clientY);
  };

  const handleMouseUp = (): void => {
    if (!isResizing) return;
    if (props.onChange) {
      const finalHeight = currentHeightRef.current;
      if (props.maxHeight && finalHeight > props.maxHeight) {
        props.onChange(props.maxHeight);
      } else {
        props.onChange(finalHeight);
      }
    }
    setIsResizing(false);
  };

  const handleMouseMove = (event: MouseEvent): void => {
    if (!isResizing) return;

    const newHeight =
      props.direction === 'ttb'
        ? Math.max(boxHeight + (event.clientY - initialY), 50)
        : Math.max(boxHeight - (event.clientY - initialY), 50);

    if (props.maxHeight && newHeight > props.maxHeight) return;

    setBoxHeight(newHeight);
    currentHeightRef.current = newHeight;
    setInitialY(event.clientY);
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
    <Box display={'flex'} position={'relative'} overflow={'hidden'} height={boxHeight}>
      <ResizableToggle onMouseDown={handleMouseDown} direction={props.direction} />
      {props.children}
    </Box>
  );
}
