import api from '@/api';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import ServerGrid from '../ServerGrid/ServerGrid';
import ServerRowActions from '../ServerGrid/ServerRowActions';
import { type ServerToolProps } from '../serverToolShared';

export default function Operations({ connectionId }: ServerToolProps): JSX.Element {
  const confirmDanger = useConfirmModalStore((s) => s.danger);
  const qc = useQueryClient();
  const { data, isError } = useQuery({
    queryKey: ['server', 'operations', connectionId],
    queryFn: () => api.nosql.serverOperations(connectionId),
    refetchInterval: 3000
  });

  const kill = (id: string): void =>
    confirmDanger(locales.server_kill, locales.server_kill_confirm.replace('{id}', id), () => {
      void withSafeModeRetry(async () => {
        await api.nosql.serverKill(connectionId, id, true);
        return true;
      }, connectionId)
        .then((done) => {
          if (done) void qc.invalidateQueries({ queryKey: ['server', 'operations', connectionId] });
        })
        .catch(() => toast.error(locales.action_failed));
    });

  if (isError)
    return (
      <Typography color='error' role='alert'>
        {locales.action_failed}
      </Typography>
    );

  return (
    <ServerGrid
      headers={[
        locales.server_op,
        locales.server_namespace,
        locales.server_running_for,
        locales.server_client,
        locales.server_command
      ]}
      values={(data ?? []).map((op) => [op.op, op.namespace, op.secs, op.client, op.command])}
      loading={!data}
      empty={locales.server_no_operations}
      action={(_row, index) => (
        <ServerRowActions
          key={data?.[index]?.id}
          actions={[
            {
              label: locales.server_kill,
              run: () => {
                const op = data?.[index];
                if (op) kill(op.id);
              },
              danger: true
            }
          ]}
        />
      )}
    />
  );
}
