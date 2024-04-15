import { Box, Divider, Typography, useTheme } from '@mui/material';
import { ModalStyled, ModalWrapperStyled } from './Modal.styled';
import { ModalProps } from './types';

export default function Modal({ open, title, children }: ModalProps) {
  const theme = useTheme();

  return (
    <ModalStyled open={open}>
      <ModalWrapperStyled>
        {title && (
          <Box mb={theme.spacing(1)}>
            <Typography variant='h6'>{title}</Typography>
            <Divider />
          </Box>
        )}
        {children}
      </ModalWrapperStyled>
    </ModalStyled>
  );
}
