import api from '@/api';
import type { CreateConnectionRequestType } from '@/api/connection/types';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ConnectionSelection from './ConnectionSelection/ConnectionSelection';
import PostgreSQL from './Postgresql/Postgresql';
import type { SelectionConnectionType } from './types';

const connectionTypes: SelectionConnectionType[] = [
  {
    name: 'PostgreSQL',
    logo: '/images/connections/postgresql_logo.svg',
    component: PostgreSQL
  }
];

export default function AddConnection(): JSX.Element {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectionType, setConnectionType] = useState<SelectionConnectionType | undefined>(undefined);
  const [step, setStep] = useState(0);

  const { mutateAsync: createConnectionMutation, isPending: createConnectionPending } = useMutation({
    mutationFn: api.connection.createConnection,
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['connections']
      });
    },
    onError: (error): void => {
      console.error('🚀 ~ createConnectionMutation ~ error:', error);
    }
  });

  const { mutateAsync: pingConnectionMutation, isPending: pingConnectionPending } = useMutation({
    mutationFn: api.connection.pingConnection,
    onError: (error): void => {
      console.error('🚀 ~ pingConnectionMutation ~ error:', error);
    }
  });

  const handleClose = (): void => {
    setConnectionType(undefined);
    searchParams.delete('showAddConnection');
    setSearchParams(searchParams);
    setStep(0);
  };

  const handleSetConnection = (connection: SelectionConnectionType | undefined): void => {
    setConnectionType(connection);
    setStep(1);
  };

  const handlePingConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (pingConnectionPending) {
      return;
    }

    await pingConnectionMutation(data);
    toast.success(locales.connection_test_success);
  };

  const handleCreateConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (createConnectionPending) {
      return;
    }

    await createConnectionMutation(data);
    toast.success(locales.connection_create_success);
    handleClose();
  };

  return (
    <Modal open={searchParams.get('showAddConnection') === 'true'} title={locales.new_connection}>
      {step === 0 && (
        <ConnectionSelection onClose={handleClose} onSubmit={handleSetConnection} connections={connectionTypes} />
      )}
      {step === 1 && connectionTypes && connectionType?.component && (
        <connectionType.component
          pingLoading={pingConnectionPending}
          submitLoading={createConnectionPending}
          onClose={handleClose}
          onPing={handlePingConnection}
          onSubmit={handleCreateConnection}
        />
      )}
    </Modal>
  );
}
