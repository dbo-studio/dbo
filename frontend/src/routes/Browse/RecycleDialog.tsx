import api from '@/api';
import locales from '@/locales';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';

type Props = { connectionId: number; onClose: () => void; onRestored: () => void };

/** Keys deleted in the last days (single or small-batch deletes), each restorable with its TTL. */
export default function RecycleDialog({ connectionId, onClose, onRestored }: Props): JSX.Element {
  const qc = useQueryClient();
  const queryKey = ['nosql', 'recycle', connectionId];
  const { data = [] } = useQuery({ queryKey, queryFn: () => api.nosql.recycleList(connectionId) });

  const restore = async (id: number): Promise<void> => {
    try {
      await withSafeModeRetry(async (confirmed) => {
        await api.nosql.recycleRestore(connectionId, id, confirmed);
        return true;
      });
      toast.success(locales.nosql_recycle_restored);
      await qc.invalidateQueries({ queryKey });
      onRestored();
    } catch {
      toast.error(locales.action_failed);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm' data-testid='recycle-dialog'>
      <DialogTitle>{locales.nosql_recycle_title}</DialogTitle>
      <DialogContent>
        {data.length === 0 && <Typography color='text.secondary'>{locales.nosql_recycle_empty}</Typography>}
        <List dense>
          {data.map((e) => (
            <ListItem
              key={e.id}
              secondaryAction={
                <Button size='small' onClick={(): void => void restore(e.id)} data-testid={`recycle-restore-${e.id}`}>
                  {locales.nosql_recycle_restore}
                </Button>
              }
            >
              <ListItemText primary={e.itemId} secondary={new Date(e.deletedAt).toLocaleString()} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.cancel}</Button>
      </DialogActions>
    </Dialog>
  );
}
