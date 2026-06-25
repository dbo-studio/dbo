import { Alert, Button, Stack } from '@mui/material';
import locales from '@/locales';
import { useAiBridge } from '@/hooks/useAiBridge';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { JSX } from 'react';

export default function QueryErrorBanner(): JSX.Element | null {
  const lastQueryError = useDataStore((s) => s.lastQueryError);
  const clearLastQueryError = useDataStore((s) => s.clearLastQueryError);
  const { askAboutError } = useAiBridge();

  if (!lastQueryError) {
    return null;
  }

  const handleAskAi = (): void => {
    const query = useTabStore.getState().getQuery();
    askAboutError(lastQueryError, query);
  };

  return (
    <Alert
      severity='error'
      onClose={clearLastQueryError}
      action={
        <Stack direction='row' spacing={1}>
          <Button color='inherit' size='small' onClick={handleAskAi}>
            {locales.ask_ai_about_error}
          </Button>
        </Stack>
      }
      sx={{ borderRadius: 0 }}
    >
      {lastQueryError}
    </Alert>
  );
}
