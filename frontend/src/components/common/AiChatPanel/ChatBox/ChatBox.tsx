import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { getAiStatus } from '@/core/ai/aiStatus';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { ChatBoxProps } from '../types';
import { ChatBoxStyled, ComposerFooterStyled, SendButtonStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
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
    <ChatBoxStyled>
      <PinnedPlan />
      {queued !== undefined && (
        <QueuedMessage message={queued} onCancel={() => setQueued(chatId, undefined)} onSendNow={onCancel} />
      )}
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput loading={loading} onSend={send} onCancel={onCancel} autocomplete={autocomplete} />
      <ComposerFooterStyled>
        <ModeBar />
        <Providers />
        <ContextBudget />
        {loading ? (
          <SendButtonStyled onClick={onCancel} variant='contained' color='primary' data-testid='ai-chat-cancel'>
            <CustomIcon type='pause' size='xs' />
          </SendButtonStyled>
        ) : (
          <SendButtonStyled onClick={() => onSend()} variant='contained' color='primary'>
            <CustomIcon type='arrowUp' size='xs' />
          </SendButtonStyled>
        )}
      </ComposerFooterStyled>
    </ChatBoxStyled>
  );
}
