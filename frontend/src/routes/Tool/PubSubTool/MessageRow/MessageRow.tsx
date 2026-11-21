import type { NoSQLStreamMessage } from '@/api/nosql/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, Button, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import { prettyPubSubPayload, PUBSUB_MONO } from '../pubSubFormat';

export type PubSubReceived = NoSQLStreamMessage & { id: number; at: number };

export default function MessageRow({ m }: { m: PubSubReceived }): JSX.Element {
  const [open, setOpen] = useState(false);
  const text = prettyPubSubPayload(m.payload);
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
        <Chip label={m.channel} sx={{ fontFamily: PUBSUB_MONO, maxWidth: 360 }} />
        <Box sx={{ flex: 1 }} />
        {long && (
          <Button onClick={(): void => setOpen(!open)}>
            {open ? locales.nosql_pubsub_collapse : locales.nosql_pubsub_expand}
          </Button>
        )}
        <Tooltip title={locales.copy}>
          <IconButton
            className='copy'
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
        sx={{
          m: 0,
          fontFamily: PUBSUB_MONO,
          typography: 'body2',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: open || !long ? 'none' : 120,
          overflow: 'hidden'
        }}
      >
        {text}
      </Box>
    </Box>
  );
}
