import type { AiMessageType } from '@/types';
import { Box, Stack } from '@mui/material';
import { useCallback, useEffect, useRef } from 'react';
import CodeMessage from './CodeMessage/CodeMessage';
import ExplanationMessage from './ExplanationMessage/ExplanationMessage';

interface MessagesProps {
  messages: AiMessageType[];
  onLoadMore?: () => Promise<void>;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

export default function Messages({ messages }: MessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTo({
        top: messagesEndRef.current.scrollHeight,
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
    <Box display={'flex'} flex={1}>
      <Box flex={1} overflow={'auto'} p={1}>
        <Stack spacing={1}>
          {messages.map((message, index) =>
            message.type === 'code' ? (
              <CodeMessage key={`${message.role}-${index}-${message.createdAt}`} message={message} />
            ) : (
              <ExplanationMessage key={`${message.role}-${index}-${message.createdAt}`} message={message} />
            )
          )}
        </Stack>

        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );
}
