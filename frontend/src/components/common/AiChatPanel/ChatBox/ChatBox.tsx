import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { getAiStatus } from '@/core/ai/aiStatus';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { ChatBoxProps } from '../types';
import { ChatBoxStyled, ComposerFooterStyled, SendButtonStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ContextBudget from './ContextBudget';
import PinnedPlan from './PinnedPlan';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import ModeBar from '../ModeBar/ModeBar';
import Providers from './Providers/Providers';

export default function ChatBox({ autocomplete, loading, onSend, onCancel }: ChatBoxProps) {
  const providers = useAiStore((state) => state.providers);
  const aiReady = getAiStatus(providers).ready;

  // Setting AI up lives in the empty state and in Settings; there is nothing to type into before then.
  if (!aiReady) return null;

  return (
    <ChatBoxStyled>
      <PinnedPlan />
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput loading={loading} onSend={onSend} onCancel={onCancel} autocomplete={autocomplete} />
      <ComposerFooterStyled>
        <ModeBar />
        <Providers />
        <ContextBudget />
        {loading ? (
          <SendButtonStyled onClick={onCancel} variant='contained' color='primary' data-testid='ai-chat-cancel'>
            <CustomIcon type='pause' size='xs' />
          </SendButtonStyled>
        ) : (
          <SendButtonStyled onClick={onSend} variant='contained' color='primary'>
            <CustomIcon type='arrowUp' size='xs' />
          </SendButtonStyled>
        )}
      </ComposerFooterStyled>
    </ChatBoxStyled>
  );
}
