import type { NoSQLItem } from '@/api/nosql/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, Button, Chip, IconButton, Popover, TextField, Tooltip, Typography } from '@mui/material';
import { type JSX, useState } from 'react';

type Props = {
  item: NoSQLItem;
  canRename: boolean;
  canTtl: boolean;
  onRename: (to: string) => void;
  onTtl: (seconds: number) => void;
};

/** 3600 -> "Expires in 1h", 90 -> "Expires in 1m 30s": a TTL read at a glance. */
export function formatTtl(seconds: number): string {
  if (seconds < 0) return locales.nosql_no_expiry;

  let rest = seconds;
  const parts: string[] = [];

  for (const [unit, size] of [
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
    ['s', 1]
  ] as const) {
    const n = Math.floor(rest / size);
    if (n > 0) {
      parts.push(`${n}${unit}`);
      rest -= n * size;
    }
  }

  return locales.nosql_expires_in.replace('{time}', parts.slice(0, 2).join(' ') || '0s');
}

type Editor = { anchor: HTMLElement; kind: 'rename' | 'ttl' };

/** Key header: id, type and expiry chips, and one small icon button per action; edits open in a popover. */
export default function ItemHeader({ item, canRename, canTtl, onRename, onTtl }: Props): JSX.Element {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [value, setValue] = useState('');

  const ttl = typeof item.meta?.ttl === 'number' ? item.meta.ttl : undefined;
  const type = typeof item.meta?.type === 'string' ? item.meta.type : undefined;

  const open =
    (kind: Editor['kind']) =>
    (e: React.MouseEvent<HTMLElement>): void => {
      setValue(kind === 'rename' ? item.id : ttl !== undefined && ttl > 0 ? String(ttl) : '');
      setEditor({ anchor: e.currentTarget, kind });
    };

  const submit = (): void => {
    if (!editor || value === '') return;
    if (editor.kind === 'rename') onRename(value);
    else onTtl(Number(value));
    setEditor(null);
  };

  return (
    <Box
      sx={{ display: 'flex', gap: 1, px: 1.5, py: 1, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}
    >
      <Typography sx={{ minWidth: 0, flexShrink: 1, fontWeight: 600 }} noWrap title={item.id}>
        {item.id}
      </Typography>
      {type && <Chip label={type} variant='outlined' />}
      {item.meta?.readonly ? <Chip label={locales.nosql_readonly} color='warning' variant='outlined' /> : null}
      {(ttl !== undefined || canTtl) && (
        <Chip
          label={formatTtl(ttl ?? -1)}
          variant='outlined'
          data-testid='item-ttl'
          {...(canTtl ? { onClick: open('ttl'), 'aria-label': 'edit-ttl' } : {})}
        />
      )}
      <Box sx={{ flex: 1 }} />
      {canRename && (
        <Tooltip title={locales.nosql_rename}>
          <IconButton aria-label='rename-key' onClick={open('rename')}>
            <CustomIcon type='edit' size='s' />
          </IconButton>
        </Tooltip>
      )}

      <Popover
        open={!!editor}
        anchorEl={editor?.anchor}
        onClose={(): void => setEditor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box
          sx={{ p: 1.5, width: 300, display: 'flex', flexDirection: 'column', gap: 1 }}
          data-testid='item-editor-popover'
        >
          <TextField
            autoFocus
            fullWidth
            type={editor?.kind === 'ttl' ? 'number' : 'text'}
            label={editor?.kind === 'ttl' ? locales.nosql_ttl : locales.nosql_rename}
            helperText={editor?.kind === 'ttl' ? locales.nosql_ttl_hint : undefined}
            value={value}
            onChange={(e): void => setValue(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter') submit();
            }}
            slotProps={{ htmlInput: { 'aria-label': editor?.kind === 'ttl' ? 'ttl-input' : 'rename-input' } }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={(): void => setEditor(null)}>{locales.cancel}</Button>
            <Button variant='contained' disabled={value === ''} onClick={submit}>
              {editor?.kind === 'ttl' ? locales.nosql_set : locales.nosql_rename}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
