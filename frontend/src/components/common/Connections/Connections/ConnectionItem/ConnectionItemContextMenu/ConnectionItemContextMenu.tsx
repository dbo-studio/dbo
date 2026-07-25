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
  const showWarningModal = useConfirmModalStore((state) => state.warning);
  const resetTabs = useTabStore((state) => state.reset);
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

      resetTabs();
      toast.success(locales.connection_delete_success);
      return;
    } catch (err) {
      console.debug('🚀 ~ deleteConnectionMutation ~ error:', err);
    }
  };

  const handleCloseConnection = async (connection: ConnectionType): Promise<boolean> => {
    try {
      const currentConnectionId = useConnectionStore.getState().currentConnectionId;
      await api.connection.updateConnection(connection.id, { isActive: false, isClose: true });

      if (Number(currentConnectionId) === connection.id) {
        clearCurrentConnection();
        resetTree();
      }

      await queryClient.invalidateQueries({
        queryKey: ['connections']
      });

      toast.success(locales.connection_closed_success);
      return true;
    } catch (err) {
      console.debug('🚀 ~ closeConnectionMutation ~ error:', err);
      toast.error(locales.connection_close_failed);
      return false;
    }
  };

  const needsCloseBeforeEdit = (target: ConnectionType): boolean => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;

    return target.isOpen || target.isActive || Number(currentConnectionId) === target.id;
  };

  const handleEditConnection = (target: ConnectionType | undefined): void => {
    if (!target) {
      return;
    }

    const openEdit = (): void => {
      updateUI({ showEditConnection: target.id });
    };

    if (!needsCloseBeforeEdit(target)) {
      openEdit();
      return;
    }

    showWarningModal(locales.edit_connection, locales.connection_edit_confirm, () => {
      void (async (): Promise<void> => {
        const closed = await handleCloseConnection(target);
        if (closed) {
          openEdit();
        }
      })();
    });
  };

  const menu: MenuType[] = [
    {
      name: locales.edit,
      icon: 'settings',
      action: (): void => handleEditConnection(connection),
      closeBeforeAction: true
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
