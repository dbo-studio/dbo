import api from '@/api';
import locales from '@/locales';
import { useBackgroundQueryStore } from '@/store/backgroundQuery/backgroundQuery.store';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState, type JSX } from 'react';
import { toast } from 'sonner';

const formatElapsed = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** What a tab shows while its query runs in the background: the user may leave, and is told when it ends. */
export default function BackgroundQueryNotice({ tabId }: { tabId: string }): JSX.Element | null {
  const query = useBackgroundQueryStore((state) => state.byTab[tabId]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!query) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [query]);

  if (!query) return null;

  const cancel = (): void => {
    void api.job
      .cancel(String(query.jobId))
      .then(() => {
        useBackgroundQueryStore.getState().clear(tabId);
        toast.info(locales.query_cancelled);
      })
      .catch(() => toast.error(locales.action_failed));
  };

  return (
    <Box
      data-testid='background-query'
      sx={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 160, p: 2 }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
        <CircularProgress size={22} />
        <Typography variant='subtitle2' sx={{ mt: 1.5 }}>
          {locales.background_query_title}
        </Typography>
        <Typography variant='body2' color='textSubdued' sx={{ mt: 0.5 }}>
          {locales.background_query_hint}
        </Typography>
        <Typography
          variant='caption'
          color='textSubdued'
          component='div'
          sx={{ mt: 1 }}
          data-testid='background-query-elapsed'
        >
          {formatElapsed(now - query.startedAt)}
        </Typography>
        <Button sx={{ mt: 1 }} onClick={cancel} data-testid='background-query-cancel'>
          {locales.cancel}
        </Button>
      </Box>
    </Box>
  );
}
