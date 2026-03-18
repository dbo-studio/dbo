import locales from '@/locales';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef } from 'react';
import { useAiChat } from '../hooks/useAiChat';
import CodeMessage from './CodeMessage/CodeMessage';
import ExplanationMessage from './ExplanationMessage/ExplanationMessage';
import { MessagesStyled } from './Messages.styled';

export default function Messages() {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { currentChat, handleLoadMore, chatPending } = useAiChat();

  const messages = currentChat?.messages ?? [];

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isNew) {
        scrollToBottom();
      }
    }
  }, [messages, scrollToBottom]);

  return (
    <MessagesStyled ref={messagesContainerRef}>
      {messages.filter((message) => !message.isNew).length > 10 && (
        <Button sx={{ marginBottom: 1 }} variant='outlined' onClick={() => void handleLoadMore()} size='small'>
          <Typography variant='caption'>{locales.load_more}</Typography>
        </Button>
      )}
      <Stack spacing={1 / 2}>
        {messages.map((message, index) =>
          message.type === 'code' ? (
            <CodeMessage key={`${message.role}-${index}-${message.createdAt}`} message={message} />
          ) : (
            <ExplanationMessage key={`${message.role}-${index}-${message.createdAt}`} message={message} />
          )
        )}

        {chatPending && (
          <>
            <Stack direction={'row'} spacing={1} alignItems={'center'}>
              <CircularProgress size={15} color='primary' />
              <Typography variant={'body2'} color='textSubdued'>
                {locales.thinking}...
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
    </MessagesStyled>
  );
}
