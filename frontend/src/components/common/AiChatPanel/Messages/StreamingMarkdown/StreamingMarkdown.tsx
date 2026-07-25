import ChatMarkdown from '../ChatMarkdown/ChatMarkdown';

type StreamingMarkdownProps = {
  content: string;
  isStreaming?: boolean;
  showCursor?: boolean;
};

export default function StreamingMarkdown({
  content,
  isStreaming = false,
  showCursor = false
}: StreamingMarkdownProps) {
  return <ChatMarkdown content={content} isStreaming={isStreaming} showCursor={showCursor} />;
}
