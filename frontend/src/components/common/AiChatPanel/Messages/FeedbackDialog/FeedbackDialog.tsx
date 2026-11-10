import locales from '@/locales';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

const PREVIEW_LENGTH = 400;

const preview = (text: string): string => (text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text);

/** Asks before anything leaves the machine and shows exactly what will be sent. */
export default function FeedbackDialog({
  rating,
  prompt,
  answer,
  onSend,
  onClose
}: {
  rating: 'up' | 'down' | null;
  prompt: string;
  answer: string;
  onSend: (rating: 'up' | 'down', comment: string) => Promise<void>;
  onClose: () => void;
}): JSX.Element {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const send = async (): Promise<void> => {
    if (!rating) return;

    setSending(true);
    try {
      await onSend(rating, comment);
      toast.success(locales.ai_feedback_sent);
      setComment('');
      onClose();
    } catch {
      toast.error(locales.ai_feedback_failed);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={rating !== null} onClose={sending ? undefined : onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{locales.ai_feedback_title}</DialogTitle>
      <DialogContent data-testid='ai-feedback-dialog'>
        <Stack spacing={1.5}>
          <Typography variant='body2' color='textSubdued'>
            {locales.ai_feedback_desc}
          </Typography>
          <Typography variant='caption' sx={{ whiteSpace: 'pre-wrap' }} data-testid='ai-feedback-prompt'>
            {preview(prompt)}
          </Typography>
          <Typography variant='caption' color='textSubdued' sx={{ whiteSpace: 'pre-wrap' }}>
            {preview(answer)}
          </Typography>
          <TextField
            size='small'
            multiline
            minRows={2}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={locales.ai_feedback_comment}
            slotProps={{ htmlInput: { maxLength: 2000, 'data-testid': 'ai-feedback-comment' } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending} data-testid='ai-feedback-cancel'>
          {locales.cancel}
        </Button>
        <Button variant='contained' onClick={() => void send()} disabled={sending} data-testid='ai-feedback-send'>
          {locales.ai_feedback_send}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
