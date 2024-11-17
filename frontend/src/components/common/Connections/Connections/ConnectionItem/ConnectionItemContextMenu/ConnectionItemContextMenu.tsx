import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import useAPI from '@/hooks/useApi.hook';
import useNavigate from '@/hooks/useNavigate.hook.ts';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ConnectionType } from '@/types';
import axios from 'axios';
import { toast } from 'sonner';
import type { ConnectionContextMenuProps } from '../../../types';

export default function ConnectionItemContextMenu({ connection, contextMenu, onClose }: ConnectionContextMenuProps) {
  const { updateShowEditConnection, updateConnections, updateCurrentConnection, currentConnection, updateLoading } =
    useConnectionStore();
  const { updateSelectedTab, updateTabs } = useTabStore();
  const showModal = useConfirmModalStore((state) => state.danger);
  const navigate = useNavigate();

  const { request: deleteConnection } = useAPI({
    apiMethod: api.connection.deleteConnection
  });

  const { request: getConnectionDetail } = useAPI({
    apiMethod: api.connection.getConnectionDetail
  });

  const handleOpenConfirm = async (connection: ConnectionType) => {
    showModal(locales.delete_action, locales.connection_delete_confirm, () => {
      handleDeleteConnection(connection);
    });
  };

  const handleRefresh = () => {
    if (!currentConnection) {
      return;
    }
    updateLoading('loading');
    getConnectionDetail({
      connectionID: currentConnection?.id,
      fromCache: false
    })
      .then((res) => {
        updateCurrentConnection(res);
        updateLoading('finished');
      })
      .catch((e) => {
        updateLoading('error');
        if (axios.isAxiosError(e)) {
          toast.error(e.message);
        }
        console.log('🚀 ~ handleRefresh ~ err:', e);
      });
  };

  const handleDeleteConnection = async (connection: ConnectionType) => {
    try {
      const res = await deleteConnection(connection.id);
      if (res.length === 0) {
        updateConnections([]);
        updateCurrentConnection(undefined);
        updateSelectedTab(undefined);
        updateTabs([]);
        toast.success(locales.connection_delete_success);
        navigate({ route: '/' });
        return;
      }

      if (currentConnection) {
        const found = res?.findIndex((connection) => currentConnection.id === connection.id);
        if (found === -1) {
          const connectionDetail = await getConnectionDetail({
            connectionID: res[res.length - 1].id,
            fromCache: true
          });
          updateSelectedTab(undefined);
          updateTabs([]);
          updateCurrentConnection(connectionDetail);
          navigate({ route: '/', tabId: undefined, connectionId: connectionDetail.id });
        }
        updateConnections(res);
      }

      toast.success(locales.connection_delete_success);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.message);
      }
      console.log('🚀 ~ handleDeleteConnection ~ err:', err);
    }
  };

  const handleEditConnection = (connections: ConnectionType | undefined) => {
    updateShowEditConnection(connections);
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
