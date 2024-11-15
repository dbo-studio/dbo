import { Box, Divider, Typography, useTheme } from '@mui/material';
import { ModalStyled, ModalWrapperStyled } from './Modal.styled';
import type { ModalProps } from './types';

export default function Modal({ open, title, children, padding, onClose }: ModalProps) {
  const theme = useTheme();

  return (
    <ModalStyled
      open={open}
      onClose={() => {
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
