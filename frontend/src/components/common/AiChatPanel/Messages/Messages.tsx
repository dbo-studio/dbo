import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Chip, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AiMessageType } from '@/types';
import { MessagesProps } from '../types';
import ChatEmptyState from './ChatEmptyState/ChatEmptyState';
import ChatErrorMessage from './ChatErrorMessage/ChatErrorMessage';
import { MessageGroupStyled, MessagesListStyled, MessagesStyled, ScrollToBottomButtonStyled } from './Messages.styled';
import StreamingPreview from './StreamingPreview/StreamingPreview';
import ThinkingMessage from './ThinkingMessage/ThinkingMessage';
import { groupLiveItems, toRenderBlocks } from '../utils/agentTrace';
import AgentItemCard from './AgentItemCard/AgentItemCard';
import MessageBlock from './MessageBlock/MessageBlock';
import ToolCallGroup from './ToolCallGroup/ToolCallGroup';
import TurnActions from './TurnActions/TurnActions';
import { useAiSession } from '../hooks/useAiSession';

export default function Messages({
  messages,
  loading,
  onLoadMore,
  onSelectPrompt,
  onRetry,
  onRegenerate,
  onCompare,
  onFeedback
}: MessagesProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { streaming, agentItems } = useAiSession();
  const density = useSettingStore((state) => state.editor.aiChatDensity ?? 'comfortable');
  const selectedQuery = useAiStore((state) => state.context.selectedQuery);
  const blocks = useMemo(() => toRenderBlocks(messages), [messages]);
  const liveBlocks = useMemo(() => groupLiveItems(agentItems), [agentItems]);
  const lastTurn = useMemo(() => {
    const lastUserIndex = messages.map((message) => message.role).lastIndexOf('user');
    return messages.slice(lastUserIndex + 1);
  }, [messages]);
  const lastPrompt = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user')?.content ?? '',
    [messages]
  );
  // Earlier SQL answer in the chat; it is the diff baseline when nothing was selected, and after a reload.
  const previousSql = useMemo(() => {
    const result = new Map<AiMessageType, string>();
    let previous: string | undefined;
    for (const message of messages) {
      if (message.role !== 'assistant' || message.type !== 'code' || message.language !== 'sql') continue;
      if (previous !== undefined) result.set(message, previous);
      previous = message.content;
    }
    return result;
  }, [messages]);
  // Only label answers once a chat holds more than one model; a single-model chat needs no chip.
  const showModelLabel = useMemo(
    () =>
      new Set(messages.filter((message) => message.role === 'assistant' && message.model).map((m) => m.model)).size > 1,
    [messages]
  );
  // Stays true while the user is at the bottom; only the user scrolling up ends it.
  const isNearBottomRef = useRef(true);
  // Our own smooth scroll fires scroll events on the way; they must not read as "user scrolled up".
  const ignoreScrollUntilRef = useRef(0);
  // The browser also scrolls on its own when content is swapped (the viewport clamps); only a scroll that
  // follows a wheel, touch, key or pointer action counts as the user leaving the bottom.
  const userIntentUntilRef = useRef(0);
  const pointerDownRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const markUserIntent = useCallback(() => {
    userIntentUntilRef.current = Date.now() + 250;
  }, []);

  useEffect(() => {
    const release = (): void => {
      pointerDownRef.current = false;
    };
    window.addEventListener('pointerup', release);
    return (): void => window.removeEventListener('pointerup', release);
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || Date.now() < ignoreScrollUntilRef.current) return;
    const threshold = 100;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    const userScrolling = pointerDownRef.current || Date.now() < userIntentUntilRef.current;
    // A wheel or touch scroll animates for a while; every event of it keeps the user's intent alive.
    if (userScrolling) markUserIntent();
    if (nearBottom) {
      isNearBottomRef.current = true;
      setShowScrollButton(false);
    } else if (userScrolling) {
      isNearBottomRef.current = false;
      setShowScrollButton(true);
    }
  }, [markUserIntent]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    isNearBottomRef.current = true;
    if (behavior === 'smooth') ignoreScrollUntilRef.current = Date.now() + 600;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  // Sending a message always brings the conversation to the bottom, wherever the user had scrolled.
  const lastMessage = messages[messages.length - 1];
  const sentJustNow = lastMessage?.role === 'user' && lastMessage.isNew;
  useEffect(() => {
    if (sentJustNow) scrollToBottom();
  }, [sentJustNow, messages.length, scrollToBottom]);

  // Whatever makes the conversation taller (tokens, cards, tables) is followed while pinned to the bottom.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) scrollToBottom();
    });
    observer.observe(list);
    return (): void => observer.disconnect();
  }, [scrollToBottom]);

  const showEmpty = messages.length === 0 && !loading && streaming.status !== 'streaming';
  const showLoadMore = messages.filter((message) => !message.isNew).length > 10;

  return (
    <MessagesStyled
      ref={messagesContainerRef}
      onScroll={handleScroll}
      onWheel={markUserIntent}
      onTouchMove={markUserIntent}
      onKeyDown={markUserIntent}
      onPointerDown={() => {
        pointerDownRef.current = true;
      }}
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

      <MessagesListStyled ref={listRef}>
        {blocks.map((block) => {
          const message = block.kind === 'message' ? block.message : undefined;
          const inLastTurn = message?.role === 'assistant' && lastTurn.includes(message);
          const baseline = message ? ((inLastTurn ? selectedQuery : undefined) ?? previousSql.get(message)) : undefined;

          return <MessageBlock key={block.key} block={block} baseline={baseline} showModelLabel={showModelLabel} />;
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
          <TurnActions
            turn={lastTurn}
            prompt={lastPrompt}
            onRegenerate={onRegenerate}
            onCompare={onCompare}
            onFeedback={onFeedback}
          />
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
            onClick={() => {
              scrollToBottom('smooth');
              setShowScrollButton(false);
            }}
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
