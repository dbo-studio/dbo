import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { IDLE_SESSION } from '@/store/aiStore/slices/aiSession.slice';
import type { AiMessageType } from '@/types';
import { useMemo } from 'react';
import ChatBox from '../ChatBox/ChatBox';
import { useAiChatController } from '../hooks/useAiChatController';
import { useMessageScroll } from '../hooks/useMessageScroll';
import { MessagesProps } from '../types';
import { groupTurns, toRenderBlocks } from '../utils/agentTrace';
import ChatEmptyState from './ChatEmptyState/ChatEmptyState';
import MessageBlock from './MessageBlock/MessageBlock';
import MessageTail from './MessageTail/MessageTail';
import {
  JumpChipStyled,
  LoadMoreStyled,
  MessagesListStyled,
  MessagesStyled,
  ScrollToBottomButtonStyled,
  StickyComposerStyled,
  StickyTurnStyled
} from './Messages.styled';

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
  const { autocomplete, chatPending, handleSend, handleCancel } = useAiChatController();
  const selectedQuery = useAiStore((state) => state.context.selectedQuery);
  const streamingStatus = useAiStore(
    (state) => (state.sessions[state.currentChat?.id ?? 0] ?? IDLE_SESSION).streaming.status
  );
  const {
    messagesContainerRef,
    editComposerRef,
    listRef,
    editingUserAt,
    showScrollButton,
    setShowScrollButton,
    scrollToBottom,
    markUserIntent,
    handleScroll,
    onPointerDown
  } = useMessageScroll(messages);
  const blocks = useMemo(() => toRenderBlocks(messages), [messages]);
  const turns = useMemo(() => groupTurns(blocks), [blocks]);
  const lastUserIndex = useMemo(() => messages.map((message) => message.role).lastIndexOf('user'), [messages]);
  const lastTurn = useMemo(() => messages.slice(lastUserIndex + 1), [messages, lastUserIndex]);
  const lastPrompt = lastUserIndex >= 0 ? (messages[lastUserIndex]?.content ?? '') : '';
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

  const showEmpty = messages.length === 0 && !loading && streamingStatus !== 'streaming';
  const showLoadMore = messages.filter((message) => !message.isNew).length > 10;
  const tail = (
    <MessageTail
      loading={loading}
      lastTurn={lastTurn}
      lastPrompt={lastPrompt}
      onRetry={onRetry}
      onRegenerate={onRegenerate}
      onCompare={onCompare}
      onFeedback={onFeedback}
    />
  );

  return (
    <MessagesStyled
      ref={messagesContainerRef}
      onScroll={handleScroll}
      onWheel={markUserIntent}
      onTouchMove={markUserIntent}
      onKeyDown={markUserIntent}
      onPointerDown={onPointerDown}
      data-testid='ai-messages'
    >
      {showLoadMore && onLoadMore && (
        <LoadMoreStyled component='button' variant='caption' onClick={onLoadMore}>
          {locales.load_more}
        </LoadMoreStyled>
      )}

      {showEmpty && <ChatEmptyState onSelectPrompt={onSelectPrompt} />}

      <MessagesListStyled ref={listRef}>
        {turns.map((turn, index) => {
          const isTail = index === turns.length - 1;
          const user = turn.user;
          const isEditingThis =
            user?.kind === 'message' && editingUserAt !== null && user.message.createdAt === editingUserAt;

          return (
            <StickyTurnStyled key={turn.key}>
              {user &&
                (isEditingThis ? (
                  <StickyComposerStyled ref={editComposerRef} data-testid='ai-inline-composer'>
                    <ChatBox
                      variant='edit'
                      autoFocus
                      loading={chatPending}
                      autocomplete={autocomplete}
                      onSend={(prompt) => void handleSend(prompt)}
                      onCancel={() => void handleCancel()}
                    />
                  </StickyComposerStyled>
                ) : (
                  <StickyComposerStyled data-testid='ai-sticky-user'>
                    <MessageBlock block={user} baseline={undefined} showModelLabel={showModelLabel} />
                  </StickyComposerStyled>
                ))}

              {turn.rest.map((block) => {
                const message = block.kind === 'message' ? block.message : undefined;
                const inLastTurn = message?.role === 'assistant' && lastTurn.includes(message);
                const baseline = message
                  ? ((inLastTurn ? selectedQuery : undefined) ?? previousSql.get(message))
                  : undefined;
                return (
                  <MessageBlock key={block.key} block={block} baseline={baseline} showModelLabel={showModelLabel} />
                );
              })}

              {isTail && tail}
            </StickyTurnStyled>
          );
        })}
        {turns.length === 0 && tail}
      </MessagesListStyled>

      {showScrollButton && messages.length > 0 && (
        <ScrollToBottomButtonStyled>
          <JumpChipStyled
            clickable
            icon={<CustomIcon type='arrowDown' size='xs' />}
            label={locales.ai_jump_to_latest}
            onClick={() => {
              scrollToBottom('smooth');
              setShowScrollButton(false);
            }}
            data-testid='ai-jump-to-latest'
          />
        </ScrollToBottomButtonStyled>
      )}
    </MessagesStyled>
  );
}
