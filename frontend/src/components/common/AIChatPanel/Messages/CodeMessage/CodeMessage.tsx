import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AiMessageType } from '@/types';
import { Box, useTheme } from '@mui/material';

interface CodeMessageProps {
  message: AiMessageType;
}

export default function CodeMessage({ message }: CodeMessageProps) {
  const theme = useTheme();

  const handleInsertClick = () => {
    const getQuery = useTabStore.getState().getQuery;
    const updateQuery = useTabStore.getState().updateQuery;
    const current = getQuery?.() ?? '';
    const next = current ? `${current}\n${message.content}` : message.content;
    updateQuery?.(next);
  };

  return (
    <Box>
      <SyntaxHighlighter value={message.content} isDark={theme.palette.mode === 'dark'} />
    </Box>
  );
}
