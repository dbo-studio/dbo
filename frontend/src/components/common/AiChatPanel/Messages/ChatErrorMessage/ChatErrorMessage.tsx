import locales from '@/locales';
import { Button, Stack, Typography } from '@mui/material';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import type { ChatErrorMessageProps } from '../../types';
import { ChatErrorMessageStyled } from './ChatErrorMessage.styled';

export default function ChatErrorMessage({ message, onRetry }: ChatErrorMessageProps) {
  const [, copy] = useCopyToClipboard();

  return (
    <ChatErrorMessageStyled>
      <Stack spacing={1}>
        <Typography variant='body2' color='error' data-testid='ai-error-text'>
          {message}
        </Typography>
        <Stack direction='row' spacing={1}>
          <Button size='small' variant='outlined' onClick={onRetry}>
            {locales.retry}
          </Button>
          <Button
            size='small'
            variant='text'
            data-testid='ai-error-copy'
            onClick={() => void copy(message).then((ok) => ok && toast.success(locales.copied))}
          >
            {locales.ai_copy_error}
          </Button>
        </Stack>
      </Stack>
    </ChatErrorMessageStyled>
  );
}
