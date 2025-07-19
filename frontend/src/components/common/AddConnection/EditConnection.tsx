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

export default function EditConnection(): JSX.Element {
  const queryClient = useQueryClient();
  const [activeConnection, setActiveConnection] = useState<ConnectionType | undefined>(undefined);
  const connections = useConnectionStore((state) => state.connections);

  const showEditConnection = useSettingStore((state) => state.showEditConnection);
  const toggleShowEditConnection = useSettingStore((state) => state.toggleShowEditConnection);

  const { mutateAsync: updateConnectionMutation, isPending: updateConnectionPending } = useMutation({
    mutationFn: (variables: { id: number; data: CreateConnectionRequestType }): Promise<ConnectionType> =>
      api.connection.updateConnection(variables.id, variables.data),
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['connections']
      });
    },
    onError: (error: Error): void => {
      console.error('🚀 ~ updateConnectionMutation ~ error:', error);
    }
  });

  const { mutateAsync: pingConnectionMutation, isPending: pingConnectionPending } = useMutation({
    mutationFn: api.connection.pingConnection,
    onError: (error: Error): void => {
      console.error('🚀 ~ pingConnectionMutation ~ error:', error);
    }
  });

  const handleClose = (): void => {
    setActiveConnection(undefined);
    toggleShowEditConnection(false);
  };

  const handlePingConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (pingConnectionPending) {
      return;
    }

    await pingConnectionMutation(data);
    toast.success(locales.connection_test_success);
  };

  const handleUpdateConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (updateConnectionPending || !activeConnection) {
      return;
    }

    await updateConnectionMutation({ id: activeConnection.id, data });
    toast.success(locales.connection_update_success);
    handleClose();
  };

  useEffect(() => {
    if (showEditConnection) {
      const connection = connections?.find((connection) => connection.id === Number(showEditConnection));
      connection ? setActiveConnection(connection) : toggleShowEditConnection(false);
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
    </Modal>
  );
}
