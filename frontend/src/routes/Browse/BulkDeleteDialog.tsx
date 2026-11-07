import api from '@/api';
import { isMongoDriver } from '@/core/db/connectionAliases';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useJobResultModalStore } from '@/store/jobResultModal/jobResultModal.store';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

type Props = {
  connectionId: number;
  containerId: string;
  pattern: string;
  onClose: () => void;
  onStarted: () => void;
};

/** Typed-confirmation dialog: shows what the pattern matches first, deletes in a background job. */
export default function BulkDeleteDialog({
  connectionId,
  containerId,
  pattern,
  onClose,
  onStarted
}: Props): JSX.Element {
  const connection = useCurrentConnection();
  const openJob = useJobResultModalStore((state) => state.open);
  const [typed, setTyped] = useState('');

  const preview = useQuery({
    queryKey: ['nosql', 'bulk-preview', connectionId, containerId, pattern],
    queryFn: () => api.nosql.bulkDeletePreview(connectionId, containerId, pattern)
  });

  const start = useMutation({
    mutationFn: () => api.nosql.bulkDelete({ connectionId, containerId, pattern, confirmName: typed }),
    onSuccess: (jobId) => {
      toast.success(locales.nosql_bulk_delete_started);
      openJob(jobId, locales.nosql_bulk_delete_title);
      onStarted();
      onClose();
    },
    onError: () => toast.error(locales.action_failed)
  });

  const docs = isMongoDriver(connection?.type);
  const count = preview.data?.count ?? 0;
  const name = connection?.name ?? '';
  const countText = preview.isPending
    ? locales.nosql_bulk_delete_counting
    : count === 0
      ? (docs ? locales.nosql_bulk_delete_none_docs : locales.nosql_bulk_delete_none)
      : (preview.data?.capped
          ? docs
            ? locales.nosql_bulk_delete_count_capped_docs
            : locales.nosql_bulk_delete_count_capped
          : docs
            ? locales.nosql_bulk_delete_count_docs
            : locales.nosql_bulk_delete_count).replace(
          '{count}',
          count.toLocaleString()
        );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='xs' data-testid='bulk-delete-dialog'>
      <DialogTitle>{docs ? locales.nosql_bulk_delete_title_docs : locales.nosql_bulk_delete_title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography component='code' sx={{ fontFamily: 'monospace' }}>
          {pattern}
        </Typography>
        <Alert severity={count > 0 ? 'warning' : 'info'} data-testid='bulk-delete-count'>
          {countText}
        </Alert>
        <Typography variant='body2' color='text.secondary'>
          {docs ? locales.nosql_bulk_delete_hint_docs : locales.nosql_bulk_delete_hint}
        </Typography>
        <TextField
          size='small'
          fullWidth
          autoFocus
          placeholder={name}
          helperText={locales.nosql_bulk_delete_confirm_helper.replace('{name}', name)}
          value={typed}
          onChange={(e): void => setTyped(e.target.value)}
          slotProps={{ htmlInput: { 'aria-label': 'bulk-delete-confirm' } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.cancel}</Button>
        <Button
          color='error'
          variant='contained'
          disabled={count === 0 || typed !== name || start.isPending}
          onClick={(): void => start.mutate()}
        >
          {(docs ? locales.nosql_bulk_delete_action_docs : locales.nosql_bulk_delete_action).replace('{count}', count.toLocaleString())}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
