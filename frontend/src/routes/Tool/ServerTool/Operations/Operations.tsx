import api from '@/api';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { SERVER_TOOL_MONO, type ServerToolProps } from '../serverToolShared';

export default function Operations({ connectionId }: ServerToolProps): JSX.Element {
  const confirmDanger = useConfirmModalStore((s) => s.danger);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['server', 'operations', connectionId],
    queryFn: () => api.nosql.serverOperations(connectionId),
    refetchInterval: 3000
  });

  const kill = (id: string): void =>
    confirmDanger(locales.server_kill, locales.server_kill_confirm.replace('{id}', id), () => {
      // The dialog above is the confirmation; a locked connection still refuses.
      void api.nosql
        .serverKill(connectionId, id, true)
        .then(() => qc.invalidateQueries({ queryKey: ['server', 'operations', connectionId] }))
        .catch(() => toast.error(locales.action_failed));
    });

  if (!data) return <Typography color='text.secondary'>{locales.loading}</Typography>;
  if (data.length === 0) return <Typography color='text.secondary'>{locales.server_no_operations}</Typography>;

  return (
    <Table size='small'>
      <TableHead>
        <TableRow>
          <TableCell>{locales.server_op}</TableCell>
          <TableCell>{locales.server_namespace}</TableCell>
          <TableCell>{locales.server_running_for}</TableCell>
          <TableCell>{locales.server_client}</TableCell>
          <TableCell>{locales.server_command}</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((op) => (
          <TableRow key={op.id} data-testid='server-operation'>
            <TableCell>{op.op}</TableCell>
            <TableCell>{op.namespace}</TableCell>
            <TableCell>{op.secs}</TableCell>
            <TableCell>{op.client}</TableCell>
            <TableCell sx={{ fontFamily: SERVER_TOOL_MONO, maxWidth: 360, wordBreak: 'break-all' }}>
              {op.command}
            </TableCell>
            <TableCell align='right'>
              <Button color='error' onClick={(): void => kill(op.id)}>
                {locales.server_kill}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
