import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { Typography } from '@mui/material';
import StreamingMarkdown from '../StreamingMarkdown/StreamingMarkdown';
import { isToolCallLeakContent, sanitizeAssistantContent } from '../../utils/assistantContent';
import type { StreamingPreviewProps } from '../../types';
import { StreamingCursorStyled, StreamingPreviewStyled } from './StreamingPreview.styled';

export default function StreamingPreview({
  content,
  statusLabel,
  blockType,
  isStreaming = false
}: StreamingPreviewProps) {
  const displayContent = sanitizeAssistantContent(content);

  if (!displayContent && !statusLabel) {
    return null;
  }

  if (isToolCallLeakContent(content) && !displayContent) {
    return null;
  }

  if (blockType === 'code' && displayContent) {
    return (
      <StreamingPreviewStyled $isCode>
        <SyntaxHighlighter value={displayContent} />
        {isStreaming && <StreamingCursorStyled />}
      </StreamingPreviewStyled>
    );
  }

  return (
    <StreamingPreviewStyled>
      {statusLabel && !displayContent && (
        <Typography
          component='div'
          variant='body2'
          color='textSubdued'
          sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}
        >
          {statusLabel}
        </Typography>
      )}
      {displayContent && (
        <StreamingMarkdown content={displayContent} isStreaming={isStreaming} showCursor={isStreaming} />
      )}
    </StreamingPreviewStyled>
  );
}
