import api from '@/api';
import type { CreateConnectionRequestType } from '@/api/connection/types';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PostgreSQL from './Postgresql/Postgresql';

export default function EditConnection(): JSX.Element {
  const queryClient = useQueryClient();
  const [activeConnection, setActiveConnection] = useState<ConnectionType | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const { connections } = useConnectionStore();

  const { mutateAsync: updateConnectionMutation, isPending: updateConnectionPending } = useMutation({
    mutationFn: (variables: { id: number; data: CreateConnectionRequestType }): Promise<ConnectionType> =>
      api.connection.updateConnection(variables.id, variables.data),
    onSuccess: (connection: ConnectionType): void => {
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
    searchParams.delete('showEditConnection');
    setSearchParams(searchParams);
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
    if (searchParams.has('showEditConnection')) {
      const connection = connections?.find(
        (connection) => connection.id === Number(searchParams.get('showEditConnection'))
      );
      if (connection) {
        setActiveConnection(connection);
      } else {
        searchParams.delete('showEditConnection');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams]);

  return (
    <Modal open={searchParams.has('showEditConnection')} title={locales.edit_connection}>
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
