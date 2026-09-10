import api from '@/api';
import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Button } from '@mui/material';
import { useMutation } from '@tanstack/react-query';

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
        .catch(() => undefined);
    });
  };

  return (
    <SettingRow
      id='general.reset'
      label={locales.reset_factory}
      description={locales.reset_factory_description}
      control={
        <Button variant='outlined' size='small' color='error' onClick={handleOpenConfirm} loading={isPending}>
          {locales.delete}
        </Button>
      }
    />
  );
}
