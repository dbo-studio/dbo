import { Box, Divider, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { ModalStyled, ModalWrapperStyled } from './Modal.styled';
import type { ModalProps } from './types';

export default function Modal({ open, title, children, padding, onClose }: ModalProps): JSX.Element {
  const theme = useTheme();

  return (
    <ModalStyled
      open={open}
      onClose={(): void => {
        onClose ? onClose() : null;
      }}
    >
      <ModalWrapperStyled padding={`${padding} !important`}>
        {title && (
          <Box mb={theme.spacing(1)}>
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
