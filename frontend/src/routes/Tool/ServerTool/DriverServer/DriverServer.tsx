import api from '@/api';
import { TabMode } from '@/core/enums';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import DropDatabaseDialog from '../DropDatabaseDialog/DropDatabaseDialog';
import * as server from '@/api/server';
import Segmented from '@/components/base/Segmented/Segmented';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Box, Button, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import ServerGrid from '../ServerGrid/ServerGrid';
import ServerRowActions from '../ServerGrid/ServerRowActions';
import { formatServerUptime } from '../serverToolShared';

const tabs = {
  status: locales.server_tab_status,
  operations: locales.server_tab_operations,
  databases: locales.server_tab_databases,
  users: locales.server_tab_users
};

const activityLabels: Record<server.ActivityAction, { title: string; prompt: string }> = {
  'cancel-query': { title: locales.server_cancel_query, prompt: locales.server_cancel_query_confirm },
  'end-session': { title: locales.server_end_session, prompt: locales.server_end_session_confirm },
  'disconnect-client': { title: locales.server_disconnect_client, prompt: locales.server_disconnect_client_confirm }
};

const metricLabels: Record<string, string> = {
  version: locales.server_version,
  host: locales.server_host,
  uptime: locales.server_uptime,
  connections: locales.server_connections,
  maxConnections: locales.server_max_connections,
  edition: locales.server_edition,
  memory: locales.server_memory_usage,
  role: locales.server_role
};

export default function DriverServer({ connectionId }: { connectionId: number }) {
  const [tab, setTab] = useState<server.ServerPanelName>('status');
  const [dropping, setDropping] = useState<string>();
  const tree = useTreeStore((store) => store.tree[connectionId]);
  const create = tree?.contextMenu?.find((item) => item.name === 'createDatabase');
  const databaseNodes = tree?.children ?? [];
  const confirm = useConfirmModalStore((state) => state.danger);
  const capabilities = useQuery({
    queryKey: ['server-capabilities', connectionId],
    queryFn: () => server.capabilities(connectionId)
  });
  const panel = useQuery({
    queryKey: ['driver-server-panel', connectionId, tab],
    queryFn: () => server.panel(connectionId, tab),
    enabled: capabilities.data?.panels.includes(tab) === true,
    refetchInterval: tab === 'operations' ? 3000 : tab === 'status' ? 5000 : false,
    retry: false
  });
  const action = capabilities.data?.activityAction;
  const endActivity = (kind: server.ActivityAction, id: string, token: string) => {
    const { title, prompt } = activityLabels[kind];
    confirm(
      title,
      prompt.replace('{id}', id),
      () => {
        void withSafeModeRetry(async () => {
          await server.endActivity(connectionId, id, token);
          return true;
        }, connectionId)
          .then((done) => {
            if (done) void panel.refetch();
          })
          .catch(() => toast.error(locales.action_failed));
      },
      undefined,
      title
    );
  };

  const drop = async (name: string): Promise<void> => {
    const node = databaseNodes.find(
      (item) => item.name === name && item.contextMenu?.some((entry) => entry.name === 'dropDatabase')
    );
    if (!node) return;
    setDropping(undefined);
    try {
      const result = await withSafeModeRetry(
        () =>
          api.tree.executeAction({
            connectionId,
            nodeId: node.id,
            action: 'dropDatabase',
            data: { general: {} },
            confirmed: true
          }),
        connectionId
      );
      if (result) {
        await useTreeStore.getState().reloadTree(false);
        await panel.refetch();
      }
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const headers = panel.data?.columns ?? [];
  const rows = panel.data?.rows ?? [];
  const hasTargets = tab === 'operations' && headers.at(-1) === 'Target';
  const displayRows =
    tab === 'status'
      ? rows.map(([metric, value]) => [
          metricLabels[String(metric)] ?? metric,
          metric === 'uptime' ? formatServerUptime(Number(value)) : value
        ])
      : hasTargets
        ? rows.map((row) => row.slice(0, -1))
        : rows;
  const activityActions = (row: unknown[], index: number) => {
    const token = rows[index]?.at(-1);
    return (
      action &&
      typeof token === 'string' && (
        <ServerRowActions
          actions={[
            {
              label: activityLabels[action].title,
              run: () => endActivity(action, String(row[0]), token),
              danger: true
            }
          ]}
        />
      )
    );
  };
  const databaseActions = ([value]: unknown[]) => {
    const name = String(value);
    const canDrop = databaseNodes.some(
      (node) => node.name === name && node.contextMenu?.some((item) => item.name === 'dropDatabase')
    );
    return (
      <ServerRowActions
        key={name}
        actions={
          canDrop
            ? [
                {
                  label: locales.server_drop_database,
                  run: () => setDropping(name),
                  danger: true
                }
              ]
            : []
        }
      />
    );
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }} data-testid='server-tool'>
      {capabilities.data && (
        <Box sx={{ mb: 2 }}>
          <Segmented
            value={tab}
            onChange={setTab}
            testId='server-tabs'
            options={capabilities.data.panels.map((value) => ({ value, label: tabs[value] }))}
          />
        </Box>
      )}
      {tab === 'databases' && tree && create && (
        <Box sx={{ mb: 1 }}>
          <Button
            onClick={() => useTabStore.getState().addObjectTab(create.title, tree.id, create.name, TabMode.Object)}
          >
            {locales.server_create_database}
          </Button>
        </Box>
      )}
      {dropping && (
        <DropDatabaseDialog
          name={dropping}
          onClose={() => setDropping(undefined)}
          onConfirm={() => void drop(dropping)}
        />
      )}
      {capabilities.isError || panel.isError ? (
        <Typography color='error' role='alert'>
          {locales.action_failed}
        </Typography>
      ) : capabilities.data && !capabilities.data.panels.length ? (
        <Typography color='text.secondary'>{locales.nosql_tool_unknown}</Typography>
      ) : (
        <ServerGrid
          headers={
            tab === 'status'
              ? [locales.server_metric, locales.server_value]
              : hasTargets
                ? headers.slice(0, -1)
                : headers
          }
          values={displayRows}
          loading={capabilities.isPending || panel.isPending}
          empty={tab === 'operations' ? locales.server_no_operations : undefined}
          action={hasTargets && action ? activityActions : tab === 'databases' && create ? databaseActions : undefined}
        />
      )}
    </Box>
  );
}
