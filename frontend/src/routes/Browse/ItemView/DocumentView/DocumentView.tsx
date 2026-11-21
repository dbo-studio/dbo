import CodeEditor from '@/components/base/CodeEditor/CodeEditor';
import Segmented from '@/components/base/Segmented/Segmented';
import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import DocTreeView from '../../DocTreeView';
import type { ItemViewProps } from '../itemViewTypes';
import { ITEM_VIEW_RAW_LIMIT, asItemText, formatItemSize, tryPrettyJson } from '../itemViewUtils';

export default function DocumentView({ item, editable, onSave, tree }: ItemViewProps): JSX.Element {
  const [mode, setMode] = useState<'tree' | 'json'>(tree ? 'tree' : 'json');
  const [draft, setDraft] = useState<string | null>(null);
  const [openLarge, setOpenLarge] = useState(false);
  const [seen, setSeen] = useState(item.value);
  const size = Number(item.meta?.size ?? 0);

  // The document changed under the editor (a tree edit, a refresh): drop the stale draft.
  if (seen !== item.value) {
    setSeen(item.value);
    setDraft(null);
  }

  const tooLarge = size > ITEM_VIEW_RAW_LIMIT && !openLarge;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
        {tree && (
          <Segmented
            value={mode}
            onChange={setMode}
            testId='doc-view-mode'
            options={[
              { value: 'tree', label: locales.nosql_view_tree },
              { value: 'json', label: locales.nosql_view_json }
            ]}
          />
        )}
        {editable && mode === 'json' && !tooLarge && (
          <Button variant='contained' onClick={(): void => onSave(draft ?? asItemText(item.value))}>
            {locales.nosql_save}
          </Button>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {mode === 'tree' && tree ? (
          <DocTreeView
            connectionId={tree.connectionId}
            containerId={tree.containerId}
            itemId={item.id}
            editable={editable}
            onMutated={tree.onMutated}
          />
        ) : tooLarge ? (
          <Box
            sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'flex-start' }}
            data-testid='doc-large-warning'
          >
            <Typography color='text.secondary'>
              {locales.nosql_doc_large.replace('{size}', formatItemSize(size))}
            </Typography>
            <Button variant='outlined' onClick={(): void => setOpenLarge(true)}>
              {locales.nosql_open_anyway}
            </Button>
          </Box>
        ) : (
          <CodeEditor
            value={draft ?? asItemText(typeof item.value === 'string' ? tryPrettyJson(item.value) : item.value)}
            onChange={setDraft}
            language='json'
            editable={editable}
          />
        )}
      </Box>
    </Box>
  );
}
