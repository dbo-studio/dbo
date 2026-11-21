import EmptyState from '@/components/base/EmptyState/EmptyState';
import { supportsBackup } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { BackupTabType } from '@/types';
import { type JSX, useState } from 'react';
import { scopeFor, type Scope } from '../../ScopePicker';
import ConnectionBackups from '../ConnectionBackups/ConnectionBackups';

export default function BackupsSection({ tab }: { tab: BackupTabType }): JSX.Element {
  // Redis has nothing to dump, so it is not offered.
  const connections = (useConnectionStore((s) => s.connections) ?? []).filter((c) => supportsBackup(c.type));
  const currentConnectionId = useConnectionStore((s) => s.currentConnectionId);
  const initial =
    connections.find((c) => c.id === tab.targetConnectionId) ??
    connections.find((c) => c.id === Number(currentConnectionId)) ??
    connections[0];
  // Re-seed when the tab is reopened on another database (tree menu) or connection.
  const seed = `${tab.targetConnectionId ?? ''}:${tab.database ?? ''}`;
  const [state, setState] = useState<{ seed: string; scope: Scope }>(() => ({
    seed,
    scope: scopeFor(initial, tab.targetConnectionId === initial?.id ? tab.database : undefined)
  }));

  if (state.seed !== seed) {
    setState({ seed, scope: scopeFor(initial, tab.targetConnectionId === initial?.id ? tab.database : undefined) });
  }

  if (!initial) {
    return <EmptyState icon='connection' title={locales.backup_pick_connection} />;
  }

  const setScope = (scope: Scope): void => setState((prev) => ({ ...prev, scope }));
  const connection = connections.find((c) => c.id === state.scope.connectionId) ?? initial;

  return (
    <ConnectionBackups
      key={connection.id}
      connection={connection}
      scope={state.scope}
      onScopeChange={setScope}
      connections={connections}
    />
  );
}
