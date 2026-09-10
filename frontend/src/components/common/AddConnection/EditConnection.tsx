import api from '@/api';
import type { CreateConnectionRequestType, PingConnectionRequestType } from '@/api/connection/types';
import Modal from '@/components/base/Modal/Modal';
import { isMysqlDriver, isPostgresDriver } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect } from 'react';
import { toast } from 'sonner';
import Mysql from './Mysql/Mysql';
import PostgreSQL from './Postgresql/Postgresql';
import SQLite from './SQLite/SQLite';
import { formatPingFailureMessage, formatPingSuccessMessage } from './pingDiagnostics';

export default function EditConnection(): JSX.Element {
  const queryClient = useQueryClient();
  const connections = useConnectionStore((state) => state.connections);
  const updateConnections = useConnectionStore((state) => state.updateConnections);
  const resetTree = useTreeStore((state) => state.reset);

  const showEditConnection = useSettingStore((state) => state.ui.showEditConnection);
  const updateUI = useSettingStore((state) => state.updateUI);

  const activeConnection = showEditConnection
    ? connections?.find((connection) => connection.id === Number(showEditConnection))
    : undefined;

  const { mutateAsync: updateConnectionMutation, isPending: updateConnectionPending } = useMutation({
    mutationFn: (variables: { id: number; data: CreateConnectionRequestType }): Promise<ConnectionType> =>
      api.connection.updateConnection(variables.id, variables.data)
  });

  const { mutateAsync: pingConnectionMutation, isPending: pingConnectionPending } = useMutation({
    mutationFn: api.connection.pingConnection
  });

  const handleClose = (): void => {
    updateUI({ showEditConnection: false });
  };

  const handlePingConnection = async (data: PingConnectionRequestType): Promise<void> => {
    if (pingConnectionPending) {
      return;
    }

    try {
      const diagnostics = await pingConnectionMutation({
        id: activeConnection?.id,
        type: data.type,
        options: data.options
      });
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

  const handleUpdateConnection = async (data: CreateConnectionRequestType): Promise<void> => {
    if (updateConnectionPending || !activeConnection) {
      return;
    }

    try {
      const updatedConnection = await updateConnectionMutation({ id: activeConnection.id, data });
      const currentConnections = useConnectionStore.getState().connections;

      if (currentConnections) {
        updateConnections(
          currentConnections.map((connection) =>
            connection.id === updatedConnection.id ? updatedConnection : connection
          )
        );
      }

      if (useConnectionStore.getState().currentConnectionId === activeConnection.id) {
        resetTree();
      }

      await queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success(locales.connection_update_success);
      handleClose();
    } catch {
      /* ignored */
    }
  };

  useEffect(() => {
    if (showEditConnection && !activeConnection) {
      updateUI({ showEditConnection: false });
    }
  }, [activeConnection, showEditConnection, updateUI]);

  const formProps = activeConnection
    ? {
        connection: activeConnection,
        engine: activeConnection.type,
        pingLoading: pingConnectionPending,
        submitLoading: updateConnectionPending,
        onClose: handleClose,
        onPing: (data: CreateConnectionRequestType): void => void handlePingConnection(data),
        onSubmit: (data: CreateConnectionRequestType): void => void handleUpdateConnection(data)
      }
    : undefined;

  return (
    <Modal open={showEditConnection !== undefined && showEditConnection !== false} title={locales.edit_connection}>
      {formProps && isPostgresDriver(activeConnection?.type) && <PostgreSQL {...formProps} />}
      {formProps && isMysqlDriver(activeConnection?.type) && <Mysql {...formProps} />}
      {formProps && activeConnection?.type === 'sqlite' && <SQLite {...formProps} />}
    </Modal>
  );
}
