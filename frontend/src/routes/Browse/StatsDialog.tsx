import api from '@/api';
import { formatBytes } from '@/core/utils/formatBytes';
import locales from '@/locales';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';

type Props = { connectionId: number; containerId: string; onClose: () => void };

/** Size and indexes of one collection. */
export default function StatsDialog({ connectionId, containerId, onClose }: Props): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['nosql', 'stats', connectionId, containerId],
    queryFn: () => api.nosql.containerStats(connectionId, containerId)
  });

  const facts: [string, string][] = data
    ? [
        [locales.nosql_stats_documents, data.count.toLocaleString()],
        [locales.nosql_stats_size, formatBytes(data.size)],
        [locales.nosql_stats_avg, formatBytes(data.avgObjSize)],
        [locales.nosql_stats_storage, formatBytes(data.storageSize)]
      ]
    : [];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm' data-testid='stats-dialog'>
      <DialogTitle>{`${locales.nosql_stats_title}: ${containerId}`}</DialogTitle>
      <DialogContent>
        {isLoading && <Typography color='text.secondary'>{locales.loading}</Typography>}
        {isError && <Typography color='error'>{locales.action_failed}</Typography>}
        {data && (
          <>
            <Table size='small' sx={{ mb: 2 }}>
              <TableBody>
                {facts.map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell>{k}</TableCell>
                    <TableCell align='right' data-testid={`stat-${k}`}>
                      {v}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
              {locales.nosql_stats_indexes}
            </Typography>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{locales.name}</TableCell>
                  <TableCell>{locales.nosql_stats_keys}</TableCell>
                  <TableCell>{locales.nosql_stats_unique}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.indexes.map((i) => (
                  <TableRow key={i.name} data-testid='stats-index'>
                    <TableCell>{i.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{i.keys}</TableCell>
                    <TableCell>{i.unique ? locales.yes : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
