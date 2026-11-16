import api from '@/api';
import type { CreateConnectionRequestType, PingConnectionRequestType } from '@/api/connection/types';
import { CONNECTION_ALIASES, type ConnectionAliasDef } from '@/core/db/connectionAliases';
import { useSwitchConnection } from '@/hooks/useSwitchConnection';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { ConnectionType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useMemo, useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import ConnectionCatalog from './ConnectionCatalog/ConnectionCatalog';
import ConnectionShell from './ConnectionShell';
import Mysql from './Mysql/Mysql';
import PostgreSQL from './Postgresql/Postgresql';
import HostSql from './HostSql/HostSql';
import Mongo from './Mongo/Mongo';
import Redis from './Redis/Redis';
import SQLite from './SQLite/SQLite';
import { formatPingFailureMessage, formatPingSuccessMessage } from './pingDiagnostics';
import type { ConnectionSettingsProps, SelectionConnectionType } from './types';
import type { IconTypes } from '@/components/base/CustomIcon/types';

function formForAlias(alias: ConnectionAliasDef): ComponentType<ConnectionSettingsProps> {
  if (alias.driver === 'sqlite') {
    return SQLite;
  }
  if (alias.driver === 'redis') {
    const Form = (props: ConnectionSettingsProps): JSX.Element => <Redis {...props} engine={alias.type} />;
    Form.displayName = `RedisAlias(${alias.type})`;
    return Form;
  }
  if (alias.driver === 'mongodb') {
    return Mongo;
  }
  if (alias.driver === 'sqlserver' || alias.driver === 'clickhouse') {
    const Form = (props: ConnectionSettingsProps): JSX.Element => <HostSql {...props} engine={alias.type} />;
    Form.displayName = `HostSqlAlias(${alias.type})`;
    return Form;
  }
  if (alias.driver === 'mysql') {
    const Form = (props: ConnectionSettingsProps): JSX.Element => <Mysql {...props} engine={alias.type} />;
    Form.displayName = `MysqlAlias(${alias.type})`;
    return Form;
  }
  const Form = (props: ConnectionSettingsProps): JSX.Element => <PostgreSQL {...props} engine={alias.type} />;
  Form.displayName = `PostgresAlias(${alias.type})`;
  return Form;
}

const connectionTypes: SelectionConnectionType[] = CONNECTION_ALIASES.map((alias) => ({
  name: alias.name,
  logo: alias.logo as keyof typeof IconTypes,
  type: alias.type,
  component: formForAlias(alias)
}));

const connectionTypeByEngine = Object.fromEntries(connectionTypes.map((c) => [c.type, c])) as Record<
  ConnectionType['type'],
  SelectionConnectionType
>;

const LAST_ENGINE_KEY = 'dbo.lastConnectionType';

const initialType = ((): SelectionConnectionType => {
  try {
    return (
      connectionTypeByEngine[localStorage.getItem(LAST_ENGINE_KEY) as ConnectionType['type']] ?? connectionTypes[0]
    );
  } catch {
    return connectionTypes[0];
  }
})();

export default function AddConnection(): JSX.Element {
  const queryClient = useQueryClient();
  const { switchConnection } = useSwitchConnection();
  const [selectedType, setSelectedType] = useState<SelectionConnectionType>(initialType);

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

  const { mutateAsync: createConnectionMutation, isPending: createConnectionPending } = useMutation({
    mutationFn: api.connection.createConnection
  });

  const { mutateAsync: pingConnectionMutation, isPending: pingConnectionPending } = useMutation({
    mutationFn: api.connection.pingConnection
  });

  const selectType = (type: SelectionConnectionType): void => {
    setSelectedType(type);
    try {
      localStorage.setItem(LAST_ENGINE_KEY, type.type);
    } catch {
      /* remembering the last engine is a convenience */
    }
  };

  const handleClose = (): void => {
    updateUI({ showAddConnection: false, duplicateConnectionId: undefined });
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
      const knownIds = new Set((useConnectionStore.getState().connections ?? []).map((c) => c.id));
      await createConnectionMutation(data);
      await queryClient.invalidateQueries({
        queryKey: ['connections']
      });
      const created = useConnectionStore.getState().connections?.find((c) => !knownIds.has(c.id));
      if (created) await switchConnection(created);
      handleClose();
      toast.success(locales.connection_create_success);
    } catch {
      /* ignored */
    }
  };

  return (
    <ConnectionShell
      open={showAddConnection}
      title={locales.new_connection}
      subtitle={sourceConnection ? undefined : locales.new_connection_hint}
      engine={connectionType ? { name: connectionType.name, logo: connectionType.logo } : undefined}
      onClose={handleClose}
      rail={
        sourceConnection ? undefined : (
          <ConnectionCatalog connections={connectionTypes} selected={selectedType.type} onSelect={selectType} />
        )
      }
    >
      {connectionType?.component && (
        <connectionType.component
          key={sourceConnection ? `duplicate-${sourceConnection.id}` : `new-${connectionType.type}`}
          connection={sourceConnection}
          engine={connectionType.type}
          submitLabel={sourceConnection ? locales.save : undefined}
          pingLoading={pingConnectionPending}
          submitLoading={createConnectionPending}
          onClose={handleClose}
          onPing={(data) => void handlePingConnection(data)}
          onSubmit={(data) => void handleCreateConnection(data)}
        />
      )}
    </ConnectionShell>
  );
}
