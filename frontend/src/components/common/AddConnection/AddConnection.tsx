import api from '@/api';
import type { CreateConnectionRequestType } from '@/api/connection/types';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import ConnectionSelection from './ConnectionSelection/ConnectionSelection';
import PostgreSQL from './Postgresql/Postgresql';
import SQLite from './SQLite/SQLite';
import type { SelectionConnectionType } from './types';
import Mysql from './Mysql/Mysql';

const connectionTypes: SelectionConnectionType[] = [
  {
    name: 'PostgreSQL',
    logo: 'postgresql',
    component: PostgreSQL
  },
  {
    name: 'MySQL',
    logo: 'mysql',
    component: Mysql
  },
  {
    name: 'SQLite',
    logo: 'sqlite',
    component: SQLite
  }
];

export default function AddConnection(): JSX.Element {
  const queryClient = useQueryClient();
  const [connectionType, setConnectionType] = useState<SelectionConnectionType | undefined>(undefined);
  const [step, setStep] = useState(0);

  const showAddConnection = useSettingStore((state) => state.ui.showAddConnection);
  const updateUI = useSettingStore((state) => state.updateUI);

  const { mutateAsync: createConnectionMutation, isPending: createConnectionPending } = useMutation({
    mutationFn: api.connection.createConnection,
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
    setConnectionType(undefined);
    updateUI({ showAddConnection: false });
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

    try {
      await pingConnectionMutation(data);
      toast.success(locales.connection_test_success);
    } catch (error) {
      console.debug('🚀 ~ handlePingConnection ~ error:', error);
    }
  };

  const handleCreateConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (createConnectionPending) {
      return;
    }

    try {
      await createConnectionMutation(data);
      handleClose();
      toast.success(locales.connection_create_success);
    } catch (error) {
      console.debug('🚀 ~ handleCreateConnection ~ error:', error);
    }
  };

  return (
    <Modal open={showAddConnection} title={locales.new_connection}>
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
