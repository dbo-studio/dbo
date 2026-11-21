import api from '@/api';
import type { NoSQLChangeMessage } from '@/api/nosql/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import { type JSX, useEffect, useRef, useState } from 'react';
import { SERVER_TOOL_MONO, type ServerToolProps } from '../serverToolShared';

const SERVER_TOOL_MAX_CHANGES = 500;

export default function Changes({ connectionId }: ServerToolProps): JSX.Element {
  const [container, setContainer] = useState('');
  const [live, setLive] = useState(false);
  const [events, setEvents] = useState<(NoSQLChangeMessage & { n: number })[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const counterRef = useRef(0);

  const stop = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLive(false);
  };

  // Leaving the tab closes the stream, which makes the server stop watching.
  useEffect(() => (): void => abortRef.current?.abort(), []);

  const start = async (): Promise<void> => {
    stop();
    const controller = new AbortController();
    abortRef.current = controller;
    setEvents([]);
    setLive(true);
    try {
      await api.nosql.changeStream(connectionId, container, controller.signal, (msg) => {
        if (msg.type === 'ping') return;
        setEvents((list) => [{ ...msg, n: counterRef.current++ }, ...list].slice(0, SERVER_TOOL_MAX_CHANGES));
      });
    } catch {
      /* aborted, or the stream ended */
    } finally {
      if (abortRef.current === controller) setLive(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, maxWidth: 640 }}>
        <FieldInput
          fullWidth
          placeholder={locales.server_container}
          value={container}
          onChange={(e): void => setContainer(e.target.value)}
          inputProps={{ 'aria-label': 'changes-container' }}
        />
        {live ? (
          <Button onClick={stop} data-testid='changes-stop'>
            {locales.server_stop}
          </Button>
        ) : (
          <Button
            variant='contained'
            disabled={!container.includes('/')}
            onClick={(): void => void start()}
            data-testid='changes-watch'
          >
            {locales.server_watch}
          </Button>
        )}
      </Box>
      {events.length === 0 && (
        <Typography color='text.secondary'>
          {live ? locales.server_changes_live : locales.server_changes_idle}
        </Typography>
      )}
      {events.map((e) =>
        e.type === 'error' ? (
          <Typography key={e.n} color='error' data-testid='change-error'>
            {e.message}
          </Typography>
        ) : (
          <Box
            key={e.n}
            data-testid='change-event'
            sx={{
              fontFamily: SERVER_TOOL_MONO,
              typography: 'caption',
              py: 0.5,
              borderBottom: 1,
              borderColor: 'divider',
              wordBreak: 'break-all'
            }}
          >
            <b>{e.op}</b> {e.key} {e.doc}
          </Box>
        )
      )}
    </Box>
  );
}
