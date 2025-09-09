import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { IconButton } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';

export default function DeleteHistoryIcon(): JSX.Element {
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const showModal = useConfirmModalStore((state) => state.danger);

  const { mutateAsync: deleteHistoryMutation } = useMutation({
    mutationFn: api.histories.deleteHistories,
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['histories', currentConnection?.id]
      });
    }
  });

  const handleOpenConfirm = async (): Promise<void> => {
    showModal(locales.delete_action, locales.history_delete_confirm, () => {
      handleDeleteAllHistories();
    });
  };

  const handleDeleteAllHistories = async (): Promise<void> => {
    try {
      await deleteHistoryMutation(currentConnection?.id ?? 0);
    } catch (err) {
      console.debug('🚀 ~ handleDeleteAllHistories ~ err:', err);
    }
  };

  return (
    <IconButton onClick={handleOpenConfirm}>
      <CustomIcon size='s' type={'delete'} />
    </IconButton>
  );
}
