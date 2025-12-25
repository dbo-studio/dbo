import api from '@/api';
import type { CreateConnectionRequestType } from '@/api/connection/types';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PostgreSQL from './Postgresql/Postgresql';
import SQLite from './SQLite/SQLite';

export default function EditConnection(): JSX.Element {
  const queryClient = useQueryClient();
  const [activeConnection, setActiveConnection] = useState<ConnectionType | undefined>(undefined);
  const connections = useConnectionStore((state) => state.connections);

  const showEditConnection = useSettingStore((state) => state.ui.showEditConnection);
  const updateUI = useSettingStore((state) => state.updateUI);

  const { mutateAsync: updateConnectionMutation, isPending: updateConnectionPending } = useMutation({
    mutationFn: (variables: { id: number; data: CreateConnectionRequestType }): Promise<ConnectionType> =>
      api.connection.updateConnection(variables.id, variables.data),
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['connections']
      });
    }
  });

  const { mutateAsync: pingConnectionMutation, isPending: pingConnectionPending } = useMutation({
    mutationFn: api.connection.pingConnection
  });

  const handleClose = (): void => {
    setActiveConnection(undefined);
    updateUI({ showEditConnection: false });
  };

  const handlePingConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (pingConnectionPending) {
      return;
    }

    try {
      await pingConnectionMutation(data);
      toast.success(locales.connection_test_success);
    } catch (error) {
      console.debug('🚀 ~ handlePingConnection ~ error:', error);
    }
  };

  const handleUpdateConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (updateConnectionPending || !activeConnection) {
      return;
    }

    try {
      await updateConnectionMutation({ id: activeConnection.id, data });
      toast.success(locales.connection_update_success);
      handleClose();
    } catch (error) {
      console.debug('🚀 ~ handleUpdateConnection ~ error:', error);
    }
  };

  useEffect(() => {
    if (showEditConnection) {
      const connection = connections?.find((connection) => connection.id === Number(showEditConnection));
      if (connection) {
        setActiveConnection(connection);
      } else {
        updateUI({ showEditConnection: false });
      }
    }
  }, [showEditConnection]);

  return (
    <Modal open={showEditConnection !== undefined && showEditConnection !== false} title={locales.edit_connection}>
      {activeConnection?.type === 'postgresql' && (
        <PostgreSQL
          connection={activeConnection}
          pingLoading={pingConnectionPending}
          submitLoading={updateConnectionPending}
          onClose={handleClose}
          onPing={handlePingConnection}
          onSubmit={handleUpdateConnection}
        />
      )}

      {activeConnection?.type === 'sqlite' && (
        <SQLite
          connection={activeConnection}
          pingLoading={pingConnectionPending}
          submitLoading={updateConnectionPending}
          onClose={handleClose}
          onPing={handlePingConnection}
          onSubmit={handleUpdateConnection}
        />
      )}
    </Modal>
  );
}
