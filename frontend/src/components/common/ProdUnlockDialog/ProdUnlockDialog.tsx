import locales from '@/locales';
import { useProdUnlockStore } from '@/store/prodUnlock/prodUnlock.store';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { type JSX, useState } from 'react';

/** Typed-name confirmation that opens a 15 minute write window on a production connection. */
export default function ProdUnlockDialog(): JSX.Element | null {
  const name = useProdUnlockStore((s) => s.name);
  const answer = useProdUnlockStore((s) => s.answer);
  const [typed, setTyped] = useState('');

  if (name === null) return null;

  return (
    <Dialog open onClose={(): void => answer(false)} fullWidth maxWidth='xs' data-testid='prod-unlock-dialog'>
      <DialogTitle>{locales.prod_unlock_title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity='warning'>{locales.prod_unlock_hint}</Alert>
        <TextField
          autoFocus
          fullWidth
          placeholder={name}
          helperText={locales.nosql_bulk_delete_confirm_helper.replace('{name}', name)}
          value={typed}
          onChange={(e): void => setTyped(e.target.value)}
          slotProps={{ htmlInput: { 'aria-label': 'prod-unlock-confirm' } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={(): void => answer(false)}>{locales.cancel}</Button>
        <Button
          color='error'
          variant='contained'
          disabled={typed !== name}
          onClick={(): void => {
            setTyped('');
            answer(true);
          }}
        >
          {locales.prod_unlock_action}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
