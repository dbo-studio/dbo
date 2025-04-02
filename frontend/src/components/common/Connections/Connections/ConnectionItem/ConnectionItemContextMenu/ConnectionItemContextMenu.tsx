import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import useNavigate from '@/hooks/useNavigate.hook.ts';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { ConnectionContextMenuProps } from '../../../types';

export default function ConnectionItemContextMenu({ connection, contextMenu, onClose }: ConnectionContextMenuProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const { mutateAsync: deleteConnectionMutation, isPending: deleteConnectionPending } = useMutation({
    mutationFn: api.connection.deleteConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['connections']
      });
    },
    onError: (error) => {
      console.error('🚀 ~ deleteConnectionMutation ~ error:', error);
    }
  });

  const { updateSelectedTab, updateTabs } = useTabStore();
  const showModal = useConfirmModalStore((state) => state.danger);
  const navigate = useNavigate();

  const handleOpenConfirm = async (connection: ConnectionType) => {
    showModal(locales.delete_action, locales.connection_delete_confirm, () => {
      handleDeleteConnection(connection);
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['connections']
    });
  };

  const handleDeleteConnection = async (connection: ConnectionType) => {
    try {
      const res = await deleteConnectionMutation(connection.id);
      if (res.length === 0) {
        updateSelectedTab(undefined);
        updateTabs([]);
        toast.success(locales.connection_delete_success);
        navigate({ route: '/' });
        return;
      }

      toast.success(locales.connection_delete_success);
    } catch (err) {}
  };

  const handleEditConnection = (connections: ConnectionType | undefined) => {
    searchParams.set('showEditConnection', connections?.id.toString() || '');
    setSearchParams(searchParams);
  };

  const menu: MenuType[] = [
    {
      name: locales.edit,
      icon: 'settings',
      action: () => handleEditConnection(connection)
    },
    {
      name: locales.delete,
      icon: 'delete',
      action: () => handleOpenConfirm(connection),
      closeBeforeAction: true
    },
    {
      name: locales.refresh,
      icon: 'refresh',
      action: () => handleRefresh(),
      closeBeforeAction: true
    }
  ];

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
