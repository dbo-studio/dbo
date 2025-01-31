import { ConfirmModalStyled } from '@/components/base/Modal/ConfirmModal/ConfirmModal.styled.ts';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store.ts';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { ModalStyled } from '../Modal.styled.ts';

export default function ConfirmModal() {
  const { isOpen, mode, title, description, onCancel, onSuccess, close } = useConfirmModalStore();
  const [style, setStyle] = useState({});
  const theme = useTheme();

  useEffect(() => {
    if (mode === 'danger') {
      setStyle({
        background: theme.palette.background.danger,
        color: theme.palette.text.danger
      });
    }

    if (mode === 'success') {
      setStyle({
        background: theme.palette.background.success,
        color: theme.palette.text.success
      });
    }

    if (mode === 'warning') {
      setStyle({
        background: theme.palette.background.warning,
        color: theme.palette.text.warning
      });
    }
  }, [mode]);

  const handleCancel = () => {
    onCancel?.();
    close();
  };

  const handleConfirm = () => {
    onSuccess?.();
    close();
  };

  return (
    <ModalStyled open={isOpen}>
      <ConfirmModalStyled>
        <Box flex={1} mb={theme.spacing(1)}>
          <Box mb={theme.spacing(2)}>
            <Typography fontSize={'1.9286rem'} fontWeight={'bold'} color={theme.palette.text.text} variant='h1'>
              {title}
            </Typography>
            <Typography mt={theme.spacing(2)} color={theme.palette.text.text}>
              {description}
            </Typography>
          </Box>
        </Box>
        <Box display={'flex'} justifyContent={'end'}>
          <Button
            variant='text'
            style={{
              marginRight: theme.spacing(2)
            }}
            size='small'
            onClick={handleCancel}
          >
            {locales.cancel}
          </Button>
          <Button style={style} onClick={handleConfirm} size='small' variant='contained'>
            {locales.yes}
          </Button>
        </Box>
      </ConfirmModalStyled>
    </ModalStyled>
  );
}
