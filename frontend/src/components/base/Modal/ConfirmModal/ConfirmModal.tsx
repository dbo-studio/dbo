import { ConfirmModalStyled } from '@/components/base/Modal/ConfirmModal/ConfirmModal.styled.ts';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store.ts';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import { ModalStyled } from '../Modal.styled.ts';

export default function ConfirmModal(): JSX.Element {
  const isOpen = useConfirmModalStore((state) => state.isOpen);
  const mode = useConfirmModalStore((state) => state.mode);
  const title = useConfirmModalStore((state) => state.title);
  const description = useConfirmModalStore((state) => state.description);
  const onCancel = useConfirmModalStore((state) => state.onCancel);
  const onSuccess = useConfirmModalStore((state) => state.onSuccess);
  const close = useConfirmModalStore((state) => state.close);

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

  const handleCancel = (): void => {
    onCancel?.();
    close();
  };

  const handleConfirm = (): void => {
    onSuccess?.();
    close();
  };

  return (
    <ModalStyled open={isOpen}>
      <ConfirmModalStyled>
        <Box flex={1} mb={theme.spacing(1)}>
          <Box mb={theme.spacing(title ? 2 : 0)}>
            {title && (
              <Typography variant='h6' component='h2'>
                {title}
              </Typography>
            )}
            {description && (
              <Typography sx={{ mt: title ? 2 : 0 }} color={theme.palette.text.text}>
                {description}
              </Typography>
            )}
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
