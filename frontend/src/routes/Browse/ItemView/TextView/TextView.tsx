import CodeEditor from '@/components/base/CodeEditor/CodeEditor';
import locales from '@/locales';
import { Box, Button, MenuItem, Select } from '@mui/material';
import { type JSX, useState } from 'react';
import type { ItemViewProps, ItemTextMode } from '../itemViewTypes';
import { isBase64Item, renderItemText } from '../itemViewUtils';

export default function TextView({ item, editable, onSave }: ItemViewProps): JSX.Element {
  const binary = isBase64Item(item);
  const [mode, setMode] = useState<ItemTextMode>(binary ? 'base64' : 'raw');
  const [draft, setDraft] = useState<string | null>(null);
  const source = typeof item.value === 'string' ? item.value : '';
  // Only the transport representation round-trips losslessly, so only it is editable.
  const canEdit = editable && mode === (binary ? 'base64' : 'raw');
  const shown = canEdit ? (draft ?? source) : renderItemText(source, binary, mode);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', gap: 1, p: 1, alignItems: 'center' }}>
        <Select value={mode} onChange={(e): void => setMode(e.target.value)} aria-label='text-mode'>
          <MenuItem value='raw'>{locales.nosql_view_raw}</MenuItem>
          <MenuItem value='json'>{locales.nosql_view_json}</MenuItem>
          <MenuItem value='hex'>{locales.nosql_view_hex}</MenuItem>
          <MenuItem value='base64'>{locales.nosql_view_base64}</MenuItem>
        </Select>
        {canEdit && (
          <Button variant='contained' onClick={(): void => onSave(draft ?? source)}>
            {locales.nosql_save}
          </Button>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <CodeEditor
          value={shown}
          onChange={setDraft}
          language={mode === 'json' ? 'json' : 'plaintext'}
          editable={canEdit}
        />
      </Box>
    </Box>
  );
}
