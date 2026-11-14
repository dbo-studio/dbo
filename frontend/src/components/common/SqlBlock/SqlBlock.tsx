import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Button, Stack, Typography } from '@mui/material';
import type { JSX } from 'react';
import { toast } from 'sonner';

type SqlBlockProps = {
  /** Statements to show; they are joined into one script. */
  queries: string[];
  /** Prefix for data-testid values, e.g. `ai-sql` → `ai-sql-copy`. */
  testIdPrefix: string;
};

/** Read-only SQL with Copy and Open in Query tab. */
export default function SqlBlock({ queries, testIdPrefix }: SqlBlockProps): JSX.Element {
  const sql = queries.join(';\n');

  const copy = (): void => {
    void navigator.clipboard.writeText(sql).then(() => toast.success(locales.ai_changes_copied));
  };

  return (
    <Stack spacing={1} data-testid={testIdPrefix}>
      {sql ? <SyntaxHighlighter value={sql} /> : <Typography variant='caption'>{locales.ai_changes_no_sql}</Typography>}
      <Stack direction='row' spacing={1}>
        <Button
          variant='text'
          disabled={!sql}
          onClick={copy}
          startIcon={<CustomIcon type='copy' size='xs' />}
          data-testid={`${testIdPrefix}-copy`}
        >
          {locales.ai_changes_copy}
        </Button>
        <Button
          variant='text'
          disabled={!sql}
          onClick={() => useTabStore.getState().addEditorTab(sql, { forceNew: true })}
          startIcon={<CustomIcon type='sql' size='xs' />}
          data-testid={`${testIdPrefix}-open-query`}
        >
          {locales.ai_changes_open_query}
        </Button>
      </Stack>
    </Stack>
  );
}
