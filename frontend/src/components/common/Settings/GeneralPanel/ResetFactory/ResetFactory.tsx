import api from '@/api';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Box, Button, Divider, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';

export function ResetFactory() {
  const showModal = useConfirmModalStore((state) => state.danger);

  const { mutateAsync: resetFactory, isPending } = useMutation({
    mutationFn: async () => await api.config.resetFactory()
  });

  const handleOpenConfirm = async (): Promise<void> => {
    showModal(locales.delete_action, locales.reset_factory_confirm, () => {
      resetFactory().then(() => {
        localStorage.clear();
        window.location.reload();
      });
    });
  };

  return (
    <Box mt={1}>
      <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>
        <Box>
          <Typography color={'textText'} variant={'subtitle2'}>
            {locales.reset_factory}
          </Typography>
          <Typography color={'textText'} variant={'caption'}>
            {locales.reset_factory_description}
          </Typography>
        </Box>

        <Button variant={'outlined'} size={'small'} color={'error'} onClick={handleOpenConfirm} loading={isPending}>
          {locales.delete}
        </Button>
      </Box>
      <Divider />
    </Box>
  );
}
