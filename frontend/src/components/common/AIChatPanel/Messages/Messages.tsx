import { Button, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef } from 'react';
import type { MessagesProps } from '../types';
import CodeMessage from './CodeMessage/CodeMessage';
import ExplanationMessage from './ExplanationMessage/ExplanationMessage';
import { MessagesStyled } from './Messages.styled';

export default function Messages({ messages, onLoadMore }: MessagesProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
      <Button variant='outlined' onClick={onLoadMore} size='small'>
        <Typography variant='caption'>Load More</Typography>
      </Button>
      <Stack spacing={1} p={1}>
        {messages.map((message, index) =>
          message.type === 'code' ? (
            <CodeMessage key={`${message.role}-${index}-${message.createdAt}`} message={message} />
          ) : (
            <ExplanationMessage key={`${message.role}-${index}-${message.createdAt}`} message={message} />
          )
        )}
      </Stack>
    </MessagesStyled>
  );
}
