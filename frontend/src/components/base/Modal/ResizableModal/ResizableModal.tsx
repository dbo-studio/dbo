import {
  ResizableModalWrapperStyled,
  ResizeHandle
} from '@/components/base/Modal/ResizableModal/ ResizableModal.styled.ts';
import { Box, Divider, Typography, useTheme } from '@mui/material';
import { type JSX, useEffect, useRef, useState } from 'react';
import { ModalStyled } from '../Modal.styled.ts';
import type { ResizableModalProps } from '../types.ts';

const DEFAULT_DIMENSIONS = { width: 400, height: 400 };

export default function ResizableModal({ open, title, children, onClose, onResize }: ResizableModalProps): JSX.Element {
  const theme = useTheme();
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const dimensionsRef = useRef(dimensions);
  const onResizeRef = useRef(onResize);
  const prevOpenRef = useRef(open);

  dimensionsRef.current = dimensions;
  onResizeRef.current = onResize;

  if (open && !prevOpenRef.current) {
    setDimensions(DEFAULT_DIMENSIONS);
  }
  prevOpenRef.current = open;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isResizing) return;

      const currentDimensions = dimensionsRef.current;
      const newWidth = e.clientX - startPosition.x + currentDimensions.width / 2;
      const newHeight = e.clientY - startPosition.y + currentDimensions.height / 2;

      setDimensions({
        width: Math.max(newWidth, 300),
        height: Math.max(newHeight, 200)
      });
    };

    const handleMouseUp = (): void => {
      setIsResizing(false);
      const { width, height } = dimensionsRef.current;
      onResizeRef.current?.(width, height);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startPosition]);

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
    setStartPosition({
      x: e.clientX - (rect?.width ?? 0) / 2,
      y: e.clientY - (rect?.height ?? 0) / 2
    });
    setIsResizing(true);
    e.preventDefault();
  };

  return (
    <ModalStyled open={open} onClose={(): void => onClose?.()}>
      <ResizableModalWrapperStyled
        style={{
          width: dimensions.width,
          height: dimensions.height
        }}
      >
        {title && (
          <Box
            sx={{
              mb: theme.spacing(1)
            }}
          >
            <Typography color={'textTitle'} variant='h6'>
              {title}
            </Typography>
            <Divider />
          </Box>
        )}
        {children}
        <ResizeHandle onMouseDown={(e: React.MouseEvent<HTMLDivElement>): void => handleResizeStart(e)} />
      </ResizableModalWrapperStyled>
    </ModalStyled>
  );
}
