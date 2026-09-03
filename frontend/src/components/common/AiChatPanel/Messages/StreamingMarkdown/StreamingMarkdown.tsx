import ChatMarkdown from '../ChatMarkdown/ChatMarkdown';
import type { StreamingMarkdownProps } from '../../types';

export default function StreamingMarkdown({
  content,
  isStreaming = false,
  showCursor = false
}: StreamingMarkdownProps) {
  return <ChatMarkdown content={content} isStreaming={isStreaming} showCursor={showCursor} />;
}
