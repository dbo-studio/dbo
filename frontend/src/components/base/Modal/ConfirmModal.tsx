import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Box, Button, Divider, Typography, useTheme } from '@mui/material';
import { ConfirmModalWrapperStyled, ModalStyled } from './Modal.styled';

export default function ConfirmModal() {
  const { isOpen, title, description, onCancel, onSuccess, close } = useConfirmModalStore();
  const theme = useTheme();

  const handleCancel = () => {
    onCancel && onCancel();
    close();
  };

  const handleConfirm = () => {
    onSuccess && onSuccess();
    close();
  };

  return (
    <ModalStyled open={isOpen}>
      <ConfirmModalWrapperStyled>
        <Box flex={1} mt={theme.spacing(1)} mb={theme.spacing(1)}>
          <Box mb={theme.spacing(2)}>
            <Typography color={theme.palette.error.main} variant='h6'>
              {title}
            </Typography>
            <Divider sx={{ marginBottom: theme.spacing(1) }} />
            <Typography color={theme.palette.text.default} variant='body1'>
              {description}
            </Typography>
          </Box>
        </Box>
        <Box display={'flex'} justifyContent={'space-between'}>
          <Button size='small' onClick={handleCancel}>
            {locales.cancel}
          </Button>
          <Button onClick={handleConfirm} size='small' variant='contained'>
            {locales.yes}
          </Button>
        </Box>
      </ConfirmModalWrapperStyled>
    </ModalStyled>
  );
}
