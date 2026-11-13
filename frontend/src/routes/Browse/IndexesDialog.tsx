import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

type Props = { connectionId: number; containerId: string; canEdit: boolean; onClose: () => void };

/** Lists a collection's indexes with their usage, and creates or drops them. */
export default function IndexesDialog({ connectionId, containerId, canEdit, onClose }: Props): JSX.Element {
  const qc = useQueryClient();
  const confirmDanger = useConfirmModalStore((s) => s.danger);
  const key = ['nosql', 'indexes', connectionId, containerId];
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: () => api.nosql.indexes(connectionId, containerId)
  });

  const [keys, setKeys] = useState('');
  const [name, setName] = useState('');
  const [ttl, setTtl] = useState('');
  const [partial, setPartial] = useState('');
  const [unique, setUnique] = useState(false);
  const [sparse, setSparse] = useState(false);

  const run = async (action: (confirmed?: boolean) => Promise<void>): Promise<void> => {
    try {
      const done = await withSafeModeRetry(async (confirmed) => {
        await action(confirmed);
        return true;
      });
      if (done) await qc.invalidateQueries({ queryKey: ['nosql', 'indexes', connectionId, containerId] });
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const create = async (): Promise<void> => {
    await run((confirmed) =>
      api.nosql.createIndex(
        connectionId,
        containerId,
        {
          keys,
          name: name || undefined,
          unique,
          sparse,
          ttlSecs: ttl === '' ? null : Number(ttl),
          partial: partial || undefined
        },
        confirmed
      )
    );
    setKeys('');
    setName('');
    setTtl('');
    setPartial('');
  };

  const drop = (indexName: string): void =>
    confirmDanger(locales.nosql_index_drop, locales.nosql_index_drop_confirm.replace('{name}', indexName), () => {
      void run((confirmed) => api.nosql.dropIndex(connectionId, containerId, indexName, confirmed));
    });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='md' data-testid='indexes-dialog'>
      <DialogTitle>{`${locales.nosql_indexes_title}: ${containerId}`}</DialogTitle>
      <DialogContent>
        {isLoading && <Typography color='text.secondary'>{locales.loading}</Typography>}
        {isError && <Typography color='error'>{locales.action_failed}</Typography>}
        {data && (
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{locales.name}</TableCell>
                <TableCell>{locales.nosql_stats_keys}</TableCell>
                <TableCell>{locales.nosql_index_usage}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((i) => (
                <TableRow key={i.name} data-testid='index-row'>
                  <TableCell>
                    {i.name}
                    {i.unique ? ` · ${locales.nosql_stats_unique}` : ''}
                    {i.sparse ? ` · ${locales.nosql_index_sparse}` : ''}
                    {i.ttlSecs != null ? ` · TTL ${i.ttlSecs}s` : ''}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{i.keys}</TableCell>
                  <TableCell>{i.ops < 0 ? '' : i.ops.toLocaleString()}</TableCell>
                  <TableCell align='right'>
                    {canEdit && i.name !== '_id_' && (
                      <IconButton aria-label={`drop-${i.name}`} onClick={(): void => drop(i.name)}>
                        <CustomIcon type='delete' size='s' />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {canEdit && (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant='subtitle2'>{locales.nosql_index_create}</Typography>
            <FieldInput
              fullWidth
              placeholder={locales.nosql_index_keys}
              value={keys}
              onChange={(e): void => setKeys(e.target.value)}
              inputProps={{ 'aria-label': 'index-keys' }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FieldInput
                fullWidth
                placeholder={locales.nosql_index_name}
                value={name}
                onChange={(e): void => setName(e.target.value)}
                inputProps={{ 'aria-label': 'index-name' }}
              />
              <FieldInput
                fullWidth
                placeholder={locales.nosql_index_ttl}
                value={ttl}
                onChange={(e): void => setTtl(e.target.value.replace(/\D/g, ''))}
                inputProps={{ 'aria-label': 'index-ttl' }}
              />
            </Box>
            <FieldInput
              fullWidth
              placeholder={locales.nosql_index_partial}
              value={partial}
              onChange={(e): void => setPartial(e.target.value)}
              inputProps={{ 'aria-label': 'index-partial' }}
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={<Checkbox checked={unique} onChange={(e): void => setUnique(e.target.checked)} />}
                label={locales.nosql_stats_unique}
              />
              <FormControlLabel
                control={<Checkbox checked={sparse} onChange={(e): void => setSparse(e.target.checked)} />}
                label={locales.nosql_index_sparse}
              />
              <Button
                variant='contained'
                sx={{ ml: 'auto' }}
                disabled={!keys.trim()}
                onClick={(): void => void create()}
              >
                {locales.nosql_index_create}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
