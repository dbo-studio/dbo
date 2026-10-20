import { useScopedSelectAll } from '@/hooks';
import { Box, Divider, Typography, useTheme } from '@mui/material';
import { type JSX, useRef } from 'react';
import { ModalStyled, ModalWrapperStyled } from './Modal.styled';
import type { ModalProps } from './types';

export default function Modal({
  open,
  title,
  children,
  padding,
  onClose,
  disableEnforceFocus,
  zIndex
}: ModalProps): JSX.Element {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  useScopedSelectAll(containerRef, open);

  return (
    <ModalStyled
      open={open}
      onClose={onClose ?? undefined}
      disableEnforceFocus={disableEnforceFocus}
      sx={zIndex ? { zIndex } : undefined}
    >
      <ModalWrapperStyled ref={containerRef} padding={padding}>
        {title && (
          <Box
            data-select-all-skip
            sx={{
              mb: theme.spacing(1),
              userSelect: 'none'
            }}
          >
            <Typography color={'textTitle'} variant='h6'>
              {title}
            </Typography>
            <Divider />
          </Box>
        )}
        {children}
      </ModalWrapperStyled>
    </ModalStyled>
  );
}
