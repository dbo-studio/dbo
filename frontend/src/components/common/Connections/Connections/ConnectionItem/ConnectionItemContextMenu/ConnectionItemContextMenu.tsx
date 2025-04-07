import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { ConnectionContextMenuProps } from '../../../types';

export default function ConnectionItemContextMenu({
  connection,
  contextMenu,
  onClose
}: ConnectionContextMenuProps): JSX.Element {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { mutateAsync: deleteConnectionMutation } = useMutation({
    mutationFn: api.connection.deleteConnection,
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['connections']
      });
    },
    onError: (error: Error): void => {
      console.error('🚀 ~ deleteConnectionMutation ~ error:', error);
      toast.success(locales.connection_delete_success);
    }
  });

  const { updateSelectedTab, updateTabs } = useTabStore();
  const showModal = useConfirmModalStore((state) => state.danger);

  const handleOpenConfirm = async (connection: ConnectionType): Promise<void> => {
    showModal(locales.delete_action, locales.connection_delete_confirm, () => {
      handleDeleteConnection(connection);
    });
  };

  const handleRefresh = (): void => {
    queryClient.invalidateQueries({
      queryKey: ['connections']
    });
  };

  const handleDeleteConnection = async (connection: ConnectionType): Promise<void> => {
    try {
      await deleteConnectionMutation(connection.id);
      updateSelectedTab(undefined);
      updateTabs([]);
      toast.success(locales.connection_delete_success);
      return;
    } catch (err) {}
  };

  const handleEditConnection = (connections: ConnectionType | undefined): void => {
    searchParams.set('showEditConnection', connections?.id.toString() || '');
    setSearchParams(searchParams);
  };

  const menu: MenuType[] = [
    {
      name: locales.edit,
      icon: 'settings',
      action: (): void => handleEditConnection(connection)
    },
    {
      name: locales.delete,
      icon: 'delete',
      action: (): Promise<void> => handleOpenConfirm(connection),
      closeBeforeAction: true
    },
    {
      name: locales.refresh,
      icon: 'refresh',
      action: (): void => handleRefresh(),
      closeBeforeAction: true
    }
  ];

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
