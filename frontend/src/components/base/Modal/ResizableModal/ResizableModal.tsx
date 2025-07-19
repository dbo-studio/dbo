import {
  ResizableModalWrapperStyled,
  ResizeHandle
} from '@/components/base/Modal/ResizableModal/ ResizableModal.styled.ts';
import { Box, Divider, Typography, useTheme } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import { ModalStyled } from '../Modal.styled.ts';
import type { ResizableModalProps } from '../types.ts';

export default function ResizableModal({ open, title, children, onClose, onResize }: ResizableModalProps): JSX.Element {
  const theme = useTheme();
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: any): void => {
      if (!isResizing) return;

      const newWidth = e.clientX - startPosition.x + dimensions.width / 2;
      const newHeight = e.clientY - startPosition.y + dimensions.height / 2;

      setDimensions({
        width: Math.max(newWidth, 300),
        height: Math.max(newHeight, 200)
      });
    };

    const handleMouseUp = (): void => {
      setIsResizing(false);
      onResize(dimensions.width, dimensions.height);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startPosition, dimensions]);

  const handleResizeStart = (e: any): void => {
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    setStartPosition({
      x: e.clientX - rect.width / 2,
      y: e.clientY - rect.height / 2
    });
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (open) {
      setDimensions({ width: 400, height: 400 });
    }
  }, [open]);

  return (
    <ModalStyled open={open} onClose={(): void => onClose?.()}>
      <ResizableModalWrapperStyled
        style={{
          width: dimensions.width,
          height: dimensions.height
        }}
      >
        {title && (
          <Box mb={theme.spacing(1)}>
            <Typography color={'textTitle'} variant='h6'>
              {title}
            </Typography>
            <Divider />
          </Box>
        )}
        {children}
        <ResizeHandle onMouseDown={handleResizeStart} />
      </ResizableModalWrapperStyled>
    </ModalStyled>
  );
}
