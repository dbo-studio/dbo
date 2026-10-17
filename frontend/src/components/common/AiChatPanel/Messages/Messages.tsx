import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Chip, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessagesProps } from '../types';
import ChatEmptyState from './ChatEmptyState/ChatEmptyState';
import ChatErrorMessage from './ChatErrorMessage/ChatErrorMessage';
import CodeMessage from './CodeMessage/CodeMessage';
import { DiffBaselineContext } from './DiffBaselineContext';
import ExplanationMessage from './ExplanationMessage/ExplanationMessage';
import { MessageGroupStyled, MessagesListStyled, MessagesStyled, ScrollToBottomButtonStyled } from './Messages.styled';
import StreamingPreview from './StreamingPreview/StreamingPreview';
import ThinkingMessage from './ThinkingMessage/ThinkingMessage';
import { groupLiveItems, toRenderBlocks } from '../utils/agentTrace';
import { formatMessageTime } from '../utils/messageTime';
import AgentItemCard from './AgentItemCard/AgentItemCard';
import ToolCallGroup from './ToolCallGroup/ToolCallGroup';
import TurnActions from './TurnActions/TurnActions';

export default function Messages({
  messages,
  loading,
  onLoadMore,
  onSelectPrompt,
  onRetry,
  onRegenerate,
  onCompare
}: MessagesProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const streaming = useAiStore((state) => state.streaming);
  const density = useSettingStore((state) => state.editor.aiChatDensity ?? 'comfortable');
  const agentItems = useAiStore((state) => state.agentItems);
  const selectedQuery = useAiStore((state) => state.context.selectedQuery);
  const blocks = useMemo(() => toRenderBlocks(messages), [messages]);
  const liveBlocks = useMemo(() => groupLiveItems(agentItems), [agentItems]);
  const lastTurn = useMemo(() => {
    const lastUserIndex = messages.map((message) => message.role).lastIndexOf('user');
    return messages.slice(lastUserIndex + 1);
  }, [messages]);
  // Only label answers once a chat holds more than one model; a single-model chat needs no chip.
  const showModelLabel = useMemo(
    () =>
      new Set(messages.filter((message) => message.role === 'assistant' && message.model).map((m) => m.model)).size > 1,
    [messages]
  );
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
    agentItems,
    autoScrollToBottom
  ]);

  const showEmpty = messages.length === 0 && !loading && streaming.status !== 'streaming';
  const showLoadMore = messages.filter((message) => !message.isNew).length > 10;

  return (
    <MessagesStyled
      ref={messagesContainerRef}
      onScroll={handleScroll}
      compact={density === 'compact'}
      data-density={density}
    >
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

      {showEmpty && <ChatEmptyState onSelectPrompt={onSelectPrompt} />}

      <MessagesListStyled>
        {blocks.map((block) => {
          if (block.kind === 'message') {
            const { message } = block;
            const baseline = message.role === 'assistant' && lastTurn.includes(message) ? selectedQuery : undefined;
            return (
              <MessageGroupStyled key={block.key} title={formatMessageTime(message.createdAt)} data-testid='ai-message'>
                {message.thinking?.content && (
                  <ThinkingMessage
                    content={message.thinking.content}
                    durationMs={message.thinking.durationMs}
                    defaultCollapsed
                  />
                )}
                {showModelLabel && message.role === 'assistant' && message.model && (
                  <Typography variant='caption' color='textSubdued' data-testid='ai-message-model'>
                    {message.model}
                  </Typography>
                )}
                <DiffBaselineContext value={baseline}>
                  {message.type === 'code' ? (
                    <CodeMessage message={message} />
                  ) : (
                    <ExplanationMessage message={message} />
                  )}
                </DiffBaselineContext>
              </MessageGroupStyled>
            );
          }

          return (
            <MessageGroupStyled key={block.key}>
              {block.thinking?.content && (
                <ThinkingMessage
                  content={block.thinking.content}
                  durationMs={block.thinking.durationMs}
                  defaultCollapsed
                />
              )}
              {block.kind === 'tools' ? <ToolCallGroup items={block.items} /> : <AgentItemCard item={block.item} />}
            </MessageGroupStyled>
          );
        })}

        {streaming.status === 'streaming' && (
          <MessageGroupStyled>
            {(streaming.thinkingContent || streaming.statusLabel || !streaming.previewContent) && (
              <ThinkingMessage
                content={streaming.thinkingContent || streaming.statusLabel || ''}
                isLive={!streaming.previewContent}
              />
            )}

            {liveBlocks.map((block) =>
              block.kind === 'tools' ? (
                <ToolCallGroup key={block.key} items={block.items} live />
              ) : (
                <AgentItemCard key={block.key} item={block.item} />
              )
            )}

            {(streaming.phase === 'answering' || streaming.previewContent) && (
              <StreamingPreview content={streaming.previewContent} blockType={streaming.activeBlockType} isStreaming />
            )}
          </MessageGroupStyled>
        )}

        {!loading && streaming.status !== 'streaming' && !streaming.error && lastTurn.length > 0 && (
          <TurnActions turn={lastTurn} onRegenerate={onRegenerate} onCompare={onCompare} />
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
          <Chip
            clickable
            size='small'
            icon={<CustomIcon type='arrowDown' size='xs' />}
            label={locales.ai_jump_to_latest}
            onClick={() => scrollToBottom()}
            data-testid='ai-jump-to-latest'
            sx={{
              backgroundColor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'background.paper'
              }
            }}
          />
        </ScrollToBottomButtonStyled>
      )}
    </MessagesStyled>
  );
}
