import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AiChangeset } from '@/types';
import { Button, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX } from 'react';
import { toast } from 'sonner';

/** Read-only SQL the server would run for the ops still open. */
export default function SqlPreview({ changeset }: { changeset: AiChangeset }): JSX.Element {
  const { data: queries = [] } = useQuery({
    // Op statuses are part of the key, so the SQL follows accept/reject.
    queryKey: ['ai-changeset-sql', changeset],
    queryFn: () => api.aiChat.previewChangeset(changeset)
  });
  const sql = queries.join(';\n');

  const copy = (): void => {
    void navigator.clipboard.writeText(sql).then(() => toast.success(locales.ai_changes_copied));
  };

  return (
    <Stack spacing={1} data-testid='ai-sql-preview'>
      {sql ? <SyntaxHighlighter value={sql} /> : <Typography variant='caption'>{locales.ai_changes_no_sql}</Typography>}
      <Stack direction='row' spacing={1}>
        <Button
          size='small'
          variant='text'
          disabled={!sql}
          onClick={copy}
          startIcon={<CustomIcon type='copy' size='xs' />}
          data-testid='ai-sql-copy'
        >
          {locales.ai_changes_copy}
        </Button>
        <Button
          size='small'
          variant='text'
          disabled={!sql}
          onClick={() => useTabStore.getState().addEditorTab(sql, { forceNew: true })}
          startIcon={<CustomIcon type='sql' size='xs' />}
          data-testid='ai-sql-open-query'
        >
          {locales.ai_changes_open_query}
        </Button>
      </Stack>
    </Stack>
  );
}
