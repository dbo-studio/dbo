import locales from '@/src/locales';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { ConfirmModalWrapperStyled, ModalStyled } from './Modal.styled';
import { ConfirmModalProps } from './types';

export default function ConfirmModal({ open, title, onConfirm }: ConfirmModalProps) {
  const theme = useTheme();
  return (
    <ModalStyled open={open}>
      <ConfirmModalWrapperStyled>
        <Box flex={1} mt={theme.spacing(1)} mb={theme.spacing(1)}>
          <Typography color={theme.palette.error.main} variant='h6'>
            {title}
          </Typography>
        </Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <Button size='small' onClick={() => {}}>
            {locales.cancel}
          </Button>
          <Button onClick={onConfirm} size='small' variant='contained'>
            {locales.yes}
          </Button>
        </Box>
      </ConfirmModalWrapperStyled>
    </ModalStyled>
  );
}
