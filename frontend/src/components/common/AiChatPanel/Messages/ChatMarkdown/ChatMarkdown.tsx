import { Box, Typography, useTheme, type Theme } from '@mui/material';
import AppMarkdown from '@/components/base/AppMarkdown/AppMarkdown';
import { useMemo, type JSX } from 'react';
import ChatDataTable from '../ChatDataTable/ChatDataTable';
import { messageMarkdownSx } from '../messageMarkdownSx';
import { splitStreamingMarkdown } from '../splitStreamingMarkdown';
import { inlineCaretSx, StreamingCursorStyled } from '../StreamingPreview/StreamingPreview.styled';
import { splitChatContent, type ChatContentSegment } from '../../utils/chatTableContent';
import type { AiMessageType } from '@/types';
import type { ChatMarkdownProps } from '../../types';
import CodeMessage from '../CodeMessage/CodeMessage';

/** Fenced code in markdown gets the same actions (insert / open tab / run / copy) as code blocks. */
const renderCodeBlock = (code: string, language: string): JSX.Element => (
  <CodeMessage
    message={{
      role: 'assistant',
      type: 'code',
      content: code,
      language: language as AiMessageType['language'],
      createdAt: ''
    }}
  />
);

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
        <AppMarkdown renderCodeBlock={renderCodeBlock}>{segment.content}</AppMarkdown>
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
  const { stable, pending } = useMemo(
    () => (isStreaming ? splitStreamingMarkdown(content) : { stable: content, pending: '' }),
    [content, isStreaming]
  );
  // The finished part only changes at a paragraph break, so it is not parsed again for every token.
  const stableNode = useMemo(() => (stable ? renderSegments(stable, theme) : null), [stable, theme]);

  if (!content) {
    return null;
  }

  if (!isStreaming) {
    return <Box>{stableNode}</Box>;
  }

  // An unfinished code fence stays plain text until it closes, so it is not re-highlighted every token.
  const hasOpenFence = (pending.match(/```/g)?.length ?? 0) % 2 === 1;

  return (
    <Box>
      {stableNode}
      {pending &&
        (hasOpenFence ? (
          <Typography
            component='div'
            variant='body2'
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, wordBreak: 'break-word', mt: 0.5 }}
          >
            {pending}
          </Typography>
        ) : (
          <Typography
            component='div'
            variant='body2'
            sx={{
              ...messageMarkdownSx(theme),
              ...(showCursor ? inlineCaretSx(theme.palette.primary.main) : undefined)
            }}
          >
            <AppMarkdown renderCodeBlock={renderCodeBlock}>{pending}</AppMarkdown>
          </Typography>
        ))}
      {showCursor && (!pending || hasOpenFence) && <StreamingCursorStyled />}
    </Box>
  );
}
