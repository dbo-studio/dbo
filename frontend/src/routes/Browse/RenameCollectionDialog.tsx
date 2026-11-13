import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

type Props = { connectionId: number; containerId: string; name: string; onClose: () => void; onRenamed: () => void };

export default function RenameCollectionDialog({
  connectionId,
  containerId,
  name,
  onClose,
  onRenamed
}: Props): JSX.Element {
  const [value, setValue] = useState(name);
  const valid = value.trim() !== '' && value.trim() !== name;

  const submit = async (): Promise<void> => {
    try {
      const done = await withSafeModeRetry(async (confirmed) => {
        await api.nosql.renameCollection(connectionId, containerId, value.trim(), confirmed);
        return true;
      });
      if (done) onRenamed();
    } catch {
      toast.error(locales.action_failed);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='xs' data-testid='rename-collection-dialog'>
      <DialogTitle>{locales.nosql_rename_collection}</DialogTitle>
      <DialogContent>
        <FieldInput
          autoFocus
          fullWidth
          label={locales.nosql_new_collection_name}
          value={value}
          onChange={(e): void => setValue(e.target.value)}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' && valid) void submit();
          }}
          inputProps={{ 'aria-label': 'new-collection-name' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.cancel}</Button>
        <Button variant='contained' disabled={!valid} onClick={(): void => void submit()}>
          {locales.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
