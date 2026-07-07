import { ConfirmModalStyled } from '@/components/base/Modal/ConfirmModal/ConfirmModal.styled.ts';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store.ts';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { type JSX, useMemo } from 'react';
import { ModalStyled } from '../Modal.styled.ts';

export default function ConfirmModal(): JSX.Element {
  const isOpen = useConfirmModalStore((state) => state.isOpen);
  const mode = useConfirmModalStore((state) => state.mode);
  const title = useConfirmModalStore((state) => state.title);
  const description = useConfirmModalStore((state) => state.description);
  const confirmLabel = useConfirmModalStore((state) => state.confirmLabel);
  const onCancel = useConfirmModalStore((state) => state.onCancel);
  const onSuccess = useConfirmModalStore((state) => state.onSuccess);
  const close = useConfirmModalStore((state) => state.close);

  const theme = useTheme();

  const style = useMemo(() => {
    if (mode === 'danger') {
      return {
        background: theme.palette.background.danger,
        color: theme.palette.text.danger
      };
    }

    if (mode === 'success') {
      return {
        background: theme.palette.background.success,
        color: theme.palette.text.success
      };
    }

    if (mode === 'warning') {
      return {
        background: theme.palette.background.warning,
        color: theme.palette.text.warning
      };
    }

    return {};
  }, [mode, theme]);

  const handleCancel = (): void => {
    onCancel?.();
    close();
  };

  const handleConfirm = (): void => {
    onSuccess?.();
    close();
  };

  const resolvedConfirmLabel = confirmLabel ?? (mode === 'danger' ? locales.delete : locales.yes);

  return (
    <ModalStyled open={isOpen} onClose={handleCancel}>
      <ConfirmModalStyled>
        <Box
          sx={{
            flex: 1,
            mb: theme.spacing(1)
          }}
        >
          <Box
            sx={{
              mb: theme.spacing(title ? 2 : 0)
            }}
          >
            {title && (
              <Typography color='textTitle' variant='h6' component='h2'>
                {title}
              </Typography>
            )}
            {description && (
              <Typography sx={{ mt: title ? 2 : 0, userSelect: 'text' }} color='textText'>
                {description}
              </Typography>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'end'
          }}
        >
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
            {resolvedConfirmLabel}
          </Button>
        </Box>
      </ConfirmModalStyled>
    </ModalStyled>
  );
}
