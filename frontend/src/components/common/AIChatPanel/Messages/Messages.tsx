import type { AiMessageType } from '@/types';
import { Box, Stack } from '@mui/material';
import CodeMessage from './CodeMessage/CodeMessage';
import ExplanationMessage from './ExplanationMessage/ExplanationMessage';

export default function Messages({ messages }: { messages: AiMessageType[] }) {
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
      </Box>
    </Box>
  );
}
