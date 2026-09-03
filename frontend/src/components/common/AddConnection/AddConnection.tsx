import api from '@/api';
import type { CreateConnectionRequestType, PingConnectionRequestType } from '@/api/connection/types';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useMemo, useState } from 'react';
import { toast } from 'sonner';
import ConnectionSelection from './ConnectionSelection/ConnectionSelection';
import Mysql from './Mysql/Mysql';
import PostgreSQL from './Postgresql/Postgresql';
import SQLite from './SQLite/SQLite';
import { formatPingFailureMessage, formatPingSuccessMessage } from './pingDiagnostics';
import type { SelectionConnectionType } from './types';

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

const connectionTypeByEngine: Record<ConnectionType['type'], SelectionConnectionType> = {
  postgresql: connectionTypes[0],
  mysql: connectionTypes[1],
  sqlite: connectionTypes[2]
};

export default function AddConnection(): JSX.Element {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<SelectionConnectionType | undefined>(undefined);
  const [step, setStep] = useState(0);

  const showAddConnection = useSettingStore((state) => state.ui.showAddConnection);
  const duplicateConnectionId = useSettingStore((state) => state.ui.duplicateConnectionId);
  const updateUI = useSettingStore((state) => state.updateUI);
  const connections = useConnectionStore((state) => state.connections);

  const sourceConnection = useMemo((): ConnectionType | undefined => {
    if (duplicateConnectionId == null || !connections) {
      return undefined;
    }
    return connections.find((connection) => connection.id === duplicateConnectionId);
  }, [connections, duplicateConnectionId]);

  const connectionType = sourceConnection ? connectionTypeByEngine[sourceConnection.type] : selectedType;
  const activeStep = sourceConnection ? 1 : step;

  const { mutateAsync: createConnectionMutation, isPending: createConnectionPending } = useMutation({
    mutationFn: api.connection.createConnection
  });

  const { mutateAsync: pingConnectionMutation, isPending: pingConnectionPending } = useMutation({
    mutationFn: api.connection.pingConnection
  });

  const handleClose = (): void => {
    setSelectedType(undefined);
    updateUI({ showAddConnection: false, duplicateConnectionId: undefined });
    setStep(0);
  };

  const handleSetConnection = (connection: SelectionConnectionType | undefined): void => {
    setSelectedType(connection);
    setStep(1);
  };

  const handlePingConnection = async (data: PingConnectionRequestType): Promise<void> => {
    if (pingConnectionPending) {
      return;
    }

    try {
      const diagnostics = await pingConnectionMutation(data);
      toast.success(locales.connection_test_success, {
        description: formatPingSuccessMessage(diagnostics)
      });
    } catch (error) {
      const message = formatPingFailureMessage(error);
      if (message) {
        toast.error(message);
      }
    }
  };

  const handleCreateConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (createConnectionPending) {
      return;
    }

    try {
      await createConnectionMutation(data);
      await queryClient.invalidateQueries({
        queryKey: ['connections']
      });
      handleClose();
      toast.success(locales.connection_create_success);
    } catch (error) {
      console.debug('🚀 ~ handleCreateConnection ~ error:', error);
    }
  };

  return (
    <Modal open={showAddConnection} title={locales.new_connection}>
      {activeStep === 0 && (
        <ConnectionSelection onClose={handleClose} onSubmit={handleSetConnection} connections={connectionTypes} />
      )}
      {activeStep === 1 && connectionType?.component && (
        <connectionType.component
          key={sourceConnection ? `duplicate-${sourceConnection.id}` : 'new-connection'}
          connection={sourceConnection}
          pingLoading={pingConnectionPending}
          submitLoading={createConnectionPending}
          onClose={handleClose}
          onPing={(data) => void handlePingConnection(data)}
          onSubmit={(data) => void handleCreateConnection(data)}
        />
      )}
    </Modal>
  );
}
