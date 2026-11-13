import api from '@/api';
import type { NoSQLBrowseSort } from '@/api/nosql/types';
import locales from '@/locales';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';

type Props = {
  connectionId: number;
  containerId: string;
  filter: string;
  sorts: NoSQLBrowseSort[];
  onClose: () => void;
};

/** The server's query plan for the current filter and sort. */
export default function ExplainDialog({ connectionId, containerId, filter, sorts, onClose }: Props): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['nosql', 'explain', connectionId, containerId, filter, sorts],
    queryFn: () => api.nosql.explain({ connectionId, containerId, filter, sorts }),
    retry: false
  });

  const scan = data?.stage === 'COLLSCAN';
  const facts: [string, string][] = data
    ? [
        [locales.nosql_explain_stage, data.stage],
        [locales.nosql_explain_index, data.index || locales.nosql_explain_collscan],
        [locales.nosql_explain_returned, data.returned.toLocaleString()],
        [locales.nosql_explain_docs, data.docsExamined.toLocaleString()],
        [locales.nosql_explain_keys, data.keysExamined.toLocaleString()],
        [locales.nosql_explain_time, String(data.millis)]
      ]
    : [];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm' data-testid='explain-dialog'>
      <DialogTitle>{locales.nosql_explain}</DialogTitle>
      <DialogContent>
        {isLoading && <Typography color='text.secondary'>{locales.loading}</Typography>}
        {isError && <Typography color='error'>{locales.action_failed}</Typography>}
        {data && (
          <>
            <Table size='small'>
              <TableBody>
                {facts.map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell>{k}</TableCell>
                    <TableCell
                      align='right'
                      data-testid={`explain-${k}`}
                      sx={scan && k === locales.nosql_explain_stage ? { color: 'warning.main' } : undefined}
                    >
                      {v}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography variant='subtitle2' sx={{ mt: 2, mb: 0.5 }}>
              {locales.nosql_explain_raw}
            </Typography>
            <Box component='pre' sx={{ m: 0, p: 1, maxHeight: 240, overflow: 'auto', typography: 'caption' }}>
              {data.raw}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
