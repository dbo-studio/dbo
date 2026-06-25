import { Box, Typography, useTheme, type Theme } from '@mui/material';
import Markdown from 'react-markdown';
import type { JSX } from 'react';
import ChatDataTable from '../ChatDataTable/ChatDataTable';
import { messageMarkdownSx } from '../messageMarkdownSx';
import { splitStreamingMarkdown } from '../splitStreamingMarkdown';
import { StreamingCursorStyled } from '../StreamingPreview/StreamingPreview.styled';
import { splitChatContent } from '../../utils/chatTableContent';

type ChatMarkdownProps = {
  content: string;
  isStreaming?: boolean;
  showCursor?: boolean;
};

const renderSegments = (text: string, theme: Theme): JSX.Element[] => {
  const segments = splitChatContent(text);

  return segments.map((segment, index) => {
    if (segment.type === 'table') {
      return <ChatDataTable key={`table-${index}`} rows={segment.rows} />;
    }

    if (!segment.content.trim()) {
      return <Box key={`md-${index}`} />;
    }

    return (
      <Typography key={`md-${index}`} component='div' variant='body2' sx={messageMarkdownSx(theme)}>
        <Markdown>{segment.content}</Markdown>
      </Typography>
    );
  });
};

export default function ChatMarkdown({
  content,
  isStreaming = false,
  showCursor = false
}: ChatMarkdownProps): JSX.Element | null {
  const theme = useTheme();

  if (!content) {
    return null;
  }

  if (!isStreaming) {
    const segments = renderSegments(content, theme);
    return <Box>{segments}</Box>;
  }

  const { stable, pending } = splitStreamingMarkdown(content);

  if (!stable) {
    return (
      <Typography
        component='div'
        variant='body2'
        sx={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.65,
          wordBreak: 'break-word'
        }}
      >
        {pending}
        {showCursor && <StreamingCursorStyled />}
      </Typography>
    );
  }

  return (
    <Box>
      {renderSegments(stable, theme)}
      {pending && (
        <Typography
          component='div'
          variant='body2'
          sx={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.65,
            wordBreak: 'break-word',
            mt: 0.5
          }}
        >
          {pending}
          {showCursor && <StreamingCursorStyled />}
        </Typography>
      )}
      {!pending && showCursor && <StreamingCursorStyled />}
    </Box>
  );
}
