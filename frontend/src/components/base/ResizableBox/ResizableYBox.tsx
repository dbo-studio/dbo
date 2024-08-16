import { EventFor } from '@/types';
import { Box } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import ResizableToggle from './ResizableToggle';
import { ResizableBoxYProps } from './types';

export default function ResizableYBox(props: ResizableBoxYProps) {
  const [boxHeight, setBoxHeight] = useState(props.height);
  const [isResizing, setIsResizing] = useState(false);
  const [initialY, setInitialY] = useState(0);
  const currentHeightRef = useRef(boxHeight);

  useEffect(() => {
    currentHeightRef.current = boxHeight;
  }, [boxHeight]);

  const handleMouseDown = (event: EventFor<'div', 'onMouseDown'>) => {
    event.preventDefault();
    setIsResizing(true);
    setInitialY(event.clientY);
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
    }
  };

  const handleMouseMove = (event: any) => {
    if (!isResizing) return;

    const newHeight =
      props.direction === 'ttb'
        ? currentHeightRef.current + (event.clientY - initialY)
        : currentHeightRef.current - (event.clientY - initialY);

    const constrainedHeight = Math.min(
      Math.max(newHeight, props.height ?? 50),
      props.maxHeight ?? currentHeightRef.current * 2
    );

    setBoxHeight(constrainedHeight);
    setInitialY(event.clientY);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <Box position={'relative'} overflow={'hidden'} height={boxHeight}>
      <ResizableToggle onMouseDown={handleMouseDown} direction={props.direction} />
      {props.children}
    </Box>
  );
}
