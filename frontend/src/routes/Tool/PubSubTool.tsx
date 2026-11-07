import api from '@/api';
import type { NoSQLStreamMessage } from '@/api/nosql/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Search from '@/components/base/Search/Search';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { alpha, Box, Button, Chip, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { type JSX, type UIEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type ToolProps = { connectionId: number };
type Received = NoSQLStreamMessage & { id: number; at: number };

/** Messages kept in the view; older ones drop off the front. */
const MAX_MESSAGES = 1000;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

function pretty(payload: string | undefined): string {
  try {
    return JSON.stringify(JSON.parse(payload ?? ''), null, 2);
  } catch {
    return payload ?? '';
  }
}

function StatusPill({ running, paused }: { running: boolean; paused: boolean }): JSX.Element {
  const { palette } = useTheme();
  const color = !running ? palette.text.secondary : paused ? palette.warning.main : palette.success.main;
  const label = !running ? locales.nosql_pubsub_idle : paused ? locales.nosql_pubsub_paused : locales.nosql_pubsub_live;

  return (
    <Box
      data-testid='pubsub-status'
      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, height: 32, borderRadius: 4, bgcolor: alpha(color, 0.12), color }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: color,
          '@keyframes pubsubPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
          animation: running && !paused ? 'pubsubPulse 1.4s ease-in-out infinite' : undefined
        }}
      />
      <Typography variant='caption' sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );
}

function MessageRow({ m }: { m: Received }): JSX.Element {
  const [open, setOpen] = useState(false);
  const text = pretty(m.payload);
  const long = text.split('\n').length > 6;

  return (
    <Box
      data-testid='pubsub-message'
      sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', '&:hover .copy': { opacity: 1 } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant='caption' color='textSubdued' sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {new Date(m.at).toLocaleTimeString()}
        </Typography>
        <Chip size='small' label={m.channel} sx={{ fontFamily: MONO, maxWidth: 360 }} />
        <Box sx={{ flex: 1 }} />
        {long && (
          <Button size='small' onClick={(): void => setOpen(!open)}>
            {open ? locales.nosql_pubsub_collapse : locales.nosql_pubsub_expand}
          </Button>
        )}
        <Tooltip title={locales.copy}>
          <IconButton
            className='copy'
            size='small'
            aria-label={locales.copy}
            sx={{ opacity: 0 }}
            onClick={(): void => {
              void navigator.clipboard.writeText(m.payload ?? '').then(() => toast.success(locales.copied));
            }}
          >
            <CustomIcon type='copy' size='s' />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        component='pre'
        sx={{ m: 0, fontFamily: MONO, typography: 'body2', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: open || !long ? 'none' : 120, overflow: 'hidden' }}
      >
        {text}
      </Box>
    </Box>
  );
}

export default function PubSubTool({ connectionId }: ToolProps): JSX.Element {
  const [channel, setChannel] = useState('');
  const [messages, setMessages] = useState<Received[]>([]);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [pubChannel, setPubChannel] = useState('');
  const [pubMessage, setPubMessage] = useState('');
  const [stuck, setStuck] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  // Read inside the stream callback, which outlives the render that created it.
  const pausedRef = useRef(false);

  const stop = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  };

  const start = (): void => {
    stop();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setMessages([]);

    api.nosql
      .pubsubStream(
        connectionId,
        channel
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        controller.signal,
        (msg) => {
          if (msg.type === 'message' && !pausedRef.current) {
            setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), { ...msg, id: seq.current++, at: Date.now() }]);
          }
        }
      )
      .catch(() => undefined)
      .finally(() => {
        if (abortRef.current === controller) setRunning(false);
      });
  };

  const togglePause = (): void => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const publish = async (): Promise<void> => {
    const sent = await withSafeModeRetry(async (confirmed) => {
      await api.nosql.pubsubPublish(connectionId, pubChannel, pubMessage, confirmed);
      return true;
    });
    if (sent) toast.success(locales.nosql_pubsub_published);
  };

  // Closing the tab aborts the request, which cancels the backend subscription.
  useEffect(() => (): void => abortRef.current?.abort(), []);

  const needle = filter.toLowerCase();
  const shown = needle
    ? messages.filter((m) => `${m.channel} ${m.payload ?? ''}`.toLowerCase().includes(needle))
    : messages;

  // Follow the newest message unless the user scrolled up to read.
  useEffect(() => {
    const el = listRef.current;
    if (el && stuck) el.scrollTop = el.scrollHeight;
  }, [shown.length, stuck]);

  const onScroll = (e: UIEvent<HTMLElement>): void => {
    const el = e.currentTarget;
    setStuck(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-testid='pubsub-tool'>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FieldInput
            margin='none'
            fullWidth
            label={locales.nosql_pubsub_subscribe_to}
            placeholder={locales.nosql_channels}
            value={channel}
            disabled={running}
            onChange={(e): void => setChannel(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter' && channel.trim() && !running) start();
            }}
            inputProps={{ 'aria-label': 'pubsub-channels' }}
          />
        </Box>
        {running ? (
          <Button variant='outlined' color='error' sx={{ height: 32 }} onClick={stop}>
            {locales.nosql_stop}
          </Button>
        ) : (
          <Button variant='contained' sx={{ height: 32 }} disabled={!channel.trim()} onClick={start}>
            {locales.nosql_subscribe}
          </Button>
        )}
        <StatusPill running={running} paused={paused} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ width: 260 }}>
          <Search onChange={setFilter} placeholder={locales.nosql_pubsub_filter} />
        </Box>
        <Typography variant='caption' color='textSubdued' sx={{ flex: 1 }}>
          {locales.nosql_pubsub_count.replace('{count}', String(shown.length))}
        </Typography>
        <Tooltip title={paused ? locales.nosql_pubsub_resume : locales.nosql_pubsub_pause}>
          <span>
            <IconButton size='small' disabled={!running} onClick={togglePause} aria-label={paused ? locales.nosql_pubsub_resume : locales.nosql_pubsub_pause}>
              <CustomIcon type={paused ? 'play' : 'pause'} size='s' />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={locales.nosql_pubsub_clear}>
          <IconButton size='small' aria-label={locales.nosql_pubsub_clear} onClick={(): void => setMessages([])}>
            <CustomIcon type='delete' size='s' />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }} ref={listRef} onScroll={onScroll} data-testid='pubsub-messages'>
        {shown.length === 0 ? (
          <EmptyState
            icon='network'
            title={messages.length > 0 ? locales.nosql_pubsub_no_match : running ? locales.nosql_pubsub_waiting : locales.nosql_no_messages}
            description={running || messages.length > 0 ? undefined : locales.nosql_pubsub_hint}
          />
        ) : (
          shown.map((m) => <MessageRow key={m.id} m={m} />)
        )}
      </Box>
      {!stuck && shown.length > 0 && (
        <Box sx={{ position: 'relative' }}>
          <Button
            size='small'
            variant='contained'
            sx={{ position: 'absolute', right: 16, bottom: 8, zIndex: 1 }}
            onClick={(): void => setStuck(true)}
          >
            {locales.nosql_pubsub_latest}
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, p: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ width: 220 }}>
          <FieldInput
            margin='none'
            fullWidth
            label={locales.nosql_pubsub_channel}
            value={pubChannel}
            onChange={(e): void => setPubChannel(e.target.value)}
            inputProps={{ 'aria-label': 'pubsub-publish-channel' }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FieldInput
            margin='none'
            fullWidth
            label={locales.nosql_pubsub_message}
            value={pubMessage}
            onChange={(e): void => setPubMessage(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter' && pubChannel.trim()) void publish();
            }}
            inputProps={{ 'aria-label': 'pubsub-publish-message' }}
          />
        </Box>
        <Button variant='contained' sx={{ height: 32 }} disabled={!pubChannel.trim()} onClick={(): void => void publish()}>
          {locales.nosql_pubsub_publish}
        </Button>
      </Box>
    </Box>
  );
}
