import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import type { ConnectionContextMenuProps } from '../../../types';

export default function ConnectionItemContextMenu({
  connection,
  contextMenu,
  onClose
}: ConnectionContextMenuProps): JSX.Element {
  const queryClient = useQueryClient();
  const updateUI = useSettingStore((state) => state.updateUI);

  const { mutateAsync: deleteConnectionMutation } = useMutation({
    mutationFn: api.connection.deleteConnection
  });

  const showModal = useConfirmModalStore((state) => state.danger);
  const updateTabs = useTabStore((state) => state.updateTabs);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const clearCurrentConnection = useConnectionStore((state) => state.clearCurrentConnection);
  const resetTree = useTreeStore((state) => state.reset);

  const handleOpenConfirm = (connection: ConnectionType): void => {
    showModal(locales.delete_action, locales.connection_delete_confirm, () => {
      handleDeleteConnection(connection).catch((e) => console.log('🚀 ~ handleOpenConfirm ~ e:', e));
    });
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['connections']
    });
  };

  const handleDeleteConnection = async (connection: ConnectionType): Promise<void> => {
    try {
      await deleteConnectionMutation(connection.id);
      await queryClient.invalidateQueries({
        queryKey: ['connections']
      });

      updateSelectedTab(undefined);
      updateTabs([]);
      toast.success(locales.connection_delete_success);
      return;
    } catch (err) {
      console.debug('🚀 ~ deleteConnectionMutation ~ error:', err);
    }
  };

  const handleEditConnection = (connection: ConnectionType | undefined): void => {
    if (connection) updateUI({ showEditConnection: connection.id });
  };

  const handleCloseConnection = async (connection: ConnectionType): Promise<void> => {
    try {
      const currentConnectionId = useConnectionStore.getState().currentConnectionId;
      await api.connection.updateConnection(connection.id, { isActive: false, isClose: true });

      if (Number(currentConnectionId) === connection.id) {
        clearCurrentConnection();
        resetTree();
      }

      toast.success(locales.connection_closed_success);
    } catch (err) {
      console.debug('🚀 ~ closeConnectionMutation ~ error:', err);
      toast.error(locales.connection_close_failed);
    }
  };

  const menu: MenuType[] = [
    {
      name: locales.edit,
      icon: 'settings',
      action: (): void => handleEditConnection(connection)
    },
    {
      name: locales.close_connection,
      icon: 'close',
      action: () => void handleCloseConnection(connection),
      closeBeforeAction: true
    },
    {
      name: locales.delete,
      icon: 'delete',
      action: () => void handleOpenConfirm(connection),
      closeBeforeAction: true
    },
    {
      name: locales.refresh,
      icon: 'refresh',
      action: () => void handleRefresh(),
      closeBeforeAction: true
    }
  ];

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
