import api from '@/api';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { ConnectionType } from '@/types';
import { toast } from 'sonner';

const { updateShowEditConnection, updateConnections, updateCurrentConnection, currentConnection } =
  useConnectionStore();
const { updateSelectedTab, updateTabs } = useTabStore();
const showModal = useConfirmModalStore((state) => state.show);

const { request: deleteConnection } = useAPI({
  apiMethod: api.connection.deleteConnection
});

export const handleOpenConfirm = async (connection: ConnectionType) => {
  showModal(locales.delete_action, locales.connection_delete_confirm, () => {
    handleDeleteConnection(connection);
  });
};

export const handleDeleteConnection = async (connection: ConnectionType) => {
  try {
    const res = await deleteConnection(connection.id);
    if (res.length == 0) {
      updateConnections([]);
      updateCurrentConnection(undefined);
      updateSelectedTab(undefined);
      updateTabs([]);
    } else {
      if (currentConnection) {
        const found = res?.findIndex((connection) => currentConnection.id == connection.id);
        if (found == -1) {
          updateSelectedTab(undefined);
          updateTabs([]);
          updateCurrentConnection(res[0]);
        }
        updateConnections(res);
      }
    }
    toast.success(locales.connection_delete_success);
  } catch (err) {
    console.log('🚀 ~ handleDeleteConnection ~ err:', err);
  }
};

export const handleEditConnection = (connections: ConnectionType | undefined) => {
  updateShowEditConnection(connections);
};
