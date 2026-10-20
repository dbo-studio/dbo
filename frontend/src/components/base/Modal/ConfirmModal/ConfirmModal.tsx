import { ConfirmModalStyled } from '@/components/base/Modal/ConfirmModal/ConfirmModal.styled.ts';
import { useModalEscapeGuard, useScopedSelectAll } from '@/hooks';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store.ts';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { type JSX, useRef } from 'react';
import { ModalStyled } from '../Modal.styled.ts';
import ModalFooter from '../ModalFooter/ModalFooter';

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
  const containerRef = useRef<HTMLDivElement>(null);
  useScopedSelectAll(containerRef, isOpen);
  useModalEscapeGuard(isOpen);

  // Destructive and cautionary confirmations use the semantic button colors; everything else is the primary action.
  const confirmColor = mode === 'danger' ? 'error' : mode === 'warning' ? 'warning' : 'primary';

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
      <ConfirmModalStyled ref={containerRef}>
        <Box
          sx={{
            flex: 1
          }}
        >
          <Box
            sx={{
              mb: theme.spacing(title ? 2 : 0)
            }}
          >
            {title && (
              <Typography
                data-select-all-skip
                color='textTitle'
                variant='h6'
                component='h2'
                sx={{ userSelect: 'none' }}
              >
                {title}
              </Typography>
            )}
            {description && (
              <Typography data-select-all-root sx={{ mt: title ? 2 : 0, userSelect: 'text' }} color='textText'>
                {description}
              </Typography>
            )}
          </Box>
        </Box>
        <ModalFooter>
          <Button variant='text' size='small' autoFocus={mode === 'danger'} onClick={handleCancel}>
            {locales.cancel}
          </Button>
          <Button
            color={confirmColor}
            onClick={handleConfirm}
            size='small'
            variant='contained'
            autoFocus={mode !== 'danger'}
          >
            {resolvedConfirmLabel}
          </Button>
        </ModalFooter>
      </ConfirmModalStyled>
    </ModalStyled>
  );
}
