import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessagesProps } from '../types';
import ChatEmptyState from './ChatEmptyState/ChatEmptyState';
import ChatErrorMessage from './ChatErrorMessage/ChatErrorMessage';
import CodeMessage from './CodeMessage/CodeMessage';
import ExplanationMessage from './ExplanationMessage/ExplanationMessage';
import { MessageGroupStyled, MessagesListStyled, MessagesStyled, ScrollToBottomButtonStyled } from './Messages.styled';
import StreamingPreview from './StreamingPreview/StreamingPreview';
import ThinkingMessage from './ThinkingMessage/ThinkingMessage';
import ToolStepsMessage from './ToolStepsMessage/ToolStepsMessage';

export default function Messages({ messages, loading, onLoadMore, onSelectPrompt, onRetry }: MessagesProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const streaming = useAiStore((state) => state.streaming);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
      isNearBottomRef.current = true;
      setShowScrollButton(false);
    }
  }, []);

  const autoScrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!isNearBottomRef.current) return;
      scrollToBottom(behavior);
    },
    [scrollToBottom]
  );

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isNew) {
        autoScrollToBottom();
      }
    }
  }, [messages, autoScrollToBottom]);

  useEffect(() => {
    if (loading || streaming.status === 'streaming') {
      autoScrollToBottom('auto');
    }
  }, [
    loading,
    streaming.status,
    streaming.thinkingContent,
    streaming.previewContent,
    streaming.statusLabel,
    autoScrollToBottom
  ]);

  const showEmpty = messages.length === 0 && !loading && streaming.status !== 'streaming';
  const showLoadMore = messages.filter((message) => !message.isNew).length > 10;

  return (
    <MessagesStyled ref={messagesContainerRef} onScroll={handleScroll}>
      {showLoadMore && onLoadMore && (
        <Typography
          component='button'
          variant='caption'
          color='primary'
          onClick={onLoadMore}
          sx={{
            alignSelf: 'center',
            mb: 1,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            font: 'inherit'
          }}
        >
          {locales.load_more}
        </Typography>
      )}

      {showEmpty && onSelectPrompt && <ChatEmptyState onSelectPrompt={onSelectPrompt} />}

      <MessagesListStyled>
        {messages.map((message) => (
          <MessageGroupStyled key={`${message.role}-${message.createdAt}-${message.content.slice(0, 48)}`}>
            {message.thinking?.content && (
              <ThinkingMessage
                content={message.thinking.content}
                durationMs={message.thinking.durationMs}
                defaultCollapsed
              />
            )}
            {message.type === 'code' ? <CodeMessage message={message} /> : <ExplanationMessage message={message} />}
          </MessageGroupStyled>
        ))}

        {streaming.status === 'streaming' && (
          <MessageGroupStyled>
            <ToolStepsMessage />
            {(streaming.thinkingContent || streaming.statusLabel || !streaming.previewContent) && (
              <ThinkingMessage
                content={streaming.thinkingContent || streaming.statusLabel || ''}
                isLive={!streaming.previewContent}
              />
            )}

            {(streaming.phase === 'answering' || streaming.previewContent) && (
              <StreamingPreview content={streaming.previewContent} blockType={streaming.activeBlockType} isStreaming />
            )}
          </MessageGroupStyled>
        )}

        {loading && streaming.status !== 'streaming' && (
          <MessageGroupStyled sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, pl: 0.5 }}>
            <CircularProgress size={14} thickness={5} />
            <Typography variant='body2' color='textSubdued'>
              {locales.thinking}...
            </Typography>
          </MessageGroupStyled>
        )}

        {streaming.error && onRetry && <ChatErrorMessage message={streaming.error} onRetry={onRetry} />}
      </MessagesListStyled>

      {showScrollButton && messages.length > 0 && (
        <ScrollToBottomButtonStyled>
          <Tooltip title={locales.scroll_to_bottom}>
            <IconButton
              size='small'
              onClick={() => scrollToBottom()}
              sx={{
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                boxShadow: 1,
                '&:hover': {
                  backgroundColor: 'background.paper'
                }
              }}
            >
              <CustomIcon type='arrowDown' size='xs' />
            </IconButton>
          </Tooltip>
        </ScrollToBottomButtonStyled>
      )}
    </MessagesStyled>
  );
}
