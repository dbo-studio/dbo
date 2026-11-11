import locales from '@/locales';
import { Button, Typography } from '@mui/material';
import type { JSX } from 'react';
import { PinnedPlanStyled } from './ChatBox.styled';

/** The message waiting for the running turn to end, with Cancel and Send now (which stops the turn). */
export default function QueuedMessage({
  message,
  onCancel,
  onSendNow
}: {
  message: string;
  onCancel: () => void;
  onSendNow: () => void;
}): JSX.Element {
  return (
    <PinnedPlanStyled data-testid='ai-queued'>
      <Typography variant='caption' color='textSubdued' sx={{ flexShrink: 0 }}>
        {locales.ai_queued}
      </Typography>
      <Typography variant='caption' noWrap sx={{ flex: 1, minWidth: 0 }}>
        {message}
      </Typography>
      <Button color='inherit' onClick={onCancel} data-testid='ai-queued-cancel'>
        {locales.cancel}
      </Button>
      <Button onClick={onSendNow} data-testid='ai-queued-send-now'>
        {locales.ai_queued_send_now}
      </Button>
    </PinnedPlanStyled>
  );
}
