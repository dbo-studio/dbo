import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { getAiStatus } from '@/core/ai/aiStatus';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { ChatBoxProps } from '../types';
import { ChatBoxStyled, ComposerFooterStyled, SendButtonStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ContextAdd from './ChatContext/ContextAdd';
import ContextBudget from './ContextBudget';
import PinnedPlan from './PinnedPlan';
import QueuedMessage from './QueuedMessage';
import { useEffect } from 'react';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import ModeBar from '../ModeBar/ModeBar';
import Providers from './Providers/Providers';

export default function ChatBox({ autocomplete, loading, onSend, onCancel }: ChatBoxProps) {
  const providers = useAiStore((state) => state.providers);
  const aiReady = getAiStatus(providers).ready;
  const chatId = useAiStore((state) => state.currentChat?.id ?? 0);
  const queued = useAiStore((state) => state.sessions[chatId]?.queued?.text);
  const settled = useAiStore((state) => state.sessions[chatId]?.settled ?? 0);
  const setQueued = useAiStore((state) => state.setQueued);
  const hasText = useAiStore((state) => state.context.input.trim() !== '');

  // While a turn runs, Enter queues the message instead of dropping it, like Cursor.
  const send = (): void => {
    if (!loading) {
      onSend();
      return;
    }
    const { context, updateContext } = useAiStore.getState();
    const text = context.input.trim();
    if (!text) return;
    setQueued(chatId, text);
    updateContext({ ...context, input: '' });
  };

  useEffect(() => {
    if (loading || queued === undefined) return;
    // takeQueued waits for the running turn to settle and clears the message at once,
    // so a second mounted composer cannot send it again.
    const message = useAiStore.getState().takeQueued(chatId);
    if (message) onSend(message);
  }, [loading, queued, settled, chatId, onSend]);

  // Setting AI up lives in the empty state and in Settings; there is nothing to type into before then.
  if (!aiReady) return null;

  return (
    <ChatBoxStyled
      onMouseDown={(e) => {
        // Clicks on the padding or empty footer space land in the textarea, like every chat composer.
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.currentTarget.querySelector('textarea')?.focus();
        }
      }}
    >
      <PinnedPlan />
      {queued !== undefined && (
        <QueuedMessage message={queued} onCancel={() => setQueued(chatId, undefined)} onSendNow={onCancel} />
      )}
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput loading={loading} onSend={send} onCancel={onCancel} autocomplete={autocomplete} />
      <ComposerFooterStyled>
        {autocomplete && <ContextAdd autocomplete={autocomplete} />}
        <ModeBar />
        <Providers />
        <ContextBudget />
        {loading && !hasText ? (
          <SendButtonStyled onClick={onCancel} variant='contained' color='primary' data-testid='ai-chat-cancel'>
            <CustomIcon type='pause' size='xs' />
          </SendButtonStyled>
        ) : (
          // While a turn runs, a typed message is queued, exactly as Enter does.
          <SendButtonStyled onClick={send} disabled={!hasText} variant='contained' color='primary'>
            <CustomIcon type='arrowUp' size='xs' />
          </SendButtonStyled>
        )}
      </ComposerFooterStyled>
    </ChatBoxStyled>
  );
}
