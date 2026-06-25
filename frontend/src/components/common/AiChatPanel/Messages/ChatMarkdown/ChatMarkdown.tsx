import { Box, Typography, useTheme, type Theme } from '@mui/material';
import Markdown from 'react-markdown';
import type { JSX } from 'react';
import ChatDataTable from '../ChatDataTable/ChatDataTable';
import { messageMarkdownSx } from '../messageMarkdownSx';
import { splitStreamingMarkdown } from '../splitStreamingMarkdown';
import { StreamingCursorStyled } from '../StreamingPreview/StreamingPreview.styled';
import { splitChatContent, type ChatContentSegment } from '../../utils/chatTableContent';

type ChatMarkdownProps = {
  content: string;
  isStreaming?: boolean;
  showCursor?: boolean;
};

const getSegmentKey = (segment: ChatContentSegment): string => {
  if (segment.type === 'table') {
    const headers = Object.keys(segment.rows[0] ?? {}).join('-');
    return `table-${headers}-${segment.rows.length}-${JSON.stringify(segment.rows[0] ?? {})}`;
  }

  return `md-${segment.content.length}-${segment.content.slice(0, 64)}`;
};

const renderSegments = (text: string, theme: Theme): JSX.Element[] => {
  const segments = splitChatContent(text);

  return segments.map((segment) => {
    const key = getSegmentKey(segment);

    if (segment.type === 'table') {
      return <ChatDataTable key={key} rows={segment.rows} />;
    }

    if (!segment.content.trim()) {
      return <Box key={key} />;
    }

    return (
      <Typography key={key} component='div' variant='body2' sx={messageMarkdownSx(theme)}>
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
