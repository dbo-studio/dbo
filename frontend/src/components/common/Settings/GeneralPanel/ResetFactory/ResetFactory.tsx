import api from '@/api';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Box, Button, Divider, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { GeneralPanelSettingRowStyled } from '../GeneralPanel.styled';

export function ResetFactory() {
  const showModal = useConfirmModalStore((state) => state.danger);

  const { mutateAsync: resetFactory, isPending } = useMutation({
    mutationFn: async () => await api.config.resetFactory()
  });

  const handleOpenConfirm = (): void => {
    showModal(locales.delete_action, locales.reset_factory_confirm, () => {
      resetFactory()
        .then(() => {
          localStorage.clear();
          window.location.reload();
        })
        .catch((e) => console.debug('🚀 ~ handleOpenConfirm ~ e:', e));
    });
  };

  return (
    <Box
      sx={{
        mt: 1
      }}
    >
      <GeneralPanelSettingRowStyled>
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
      </GeneralPanelSettingRowStyled>
      <Divider />
    </Box>
  );
}
