import locales from '@/locales';
import { Button, Stack, Typography } from '@mui/material';
import type { ChatErrorMessageProps } from '../../types';
import { ChatErrorMessageStyled } from './ChatErrorMessage.styled';

export default function ChatErrorMessage({ message, onRetry }: ChatErrorMessageProps) {
  return (
    <ChatErrorMessageStyled>
      <Stack spacing={1}>
        <Typography variant='body2' color='error'>
          {message}
        </Typography>
        <Button size='small' variant='outlined' onClick={onRetry}>
          {locales.retry}
        </Button>
      </Stack>
    </ChatErrorMessageStyled>
  );
}
