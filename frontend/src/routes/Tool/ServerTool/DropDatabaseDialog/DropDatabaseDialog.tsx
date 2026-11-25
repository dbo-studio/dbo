import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { type JSX, useState } from 'react';

export default function DropDatabaseDialog({
  name,
  prompt = locales.server_drop_database_confirm_generic,
  onClose,
  onConfirm
}: {
  name: string;
  prompt?: string;
  onClose: () => void;
  onConfirm: () => void;
}): JSX.Element {
  const [typed, setTyped] = useState('');

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='xs' data-testid='drop-database-dialog'>
      <DialogTitle>{locales.server_drop_database}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 1.5 }}>{prompt.replace('{name}', name)}</Typography>
        <FieldInput
          fullWidth
          autoFocus
          value={typed}
          onChange={(e): void => setTyped(e.target.value)}
          inputProps={{ 'aria-label': 'confirm-database-name' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.cancel}</Button>
        <Button color='error' variant='contained' disabled={typed !== name} onClick={onConfirm}>
          {locales.server_drop_database}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
