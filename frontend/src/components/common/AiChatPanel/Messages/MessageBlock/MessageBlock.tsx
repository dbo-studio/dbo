import { Typography } from '@mui/material';
import { memo, type JSX } from 'react';
import type { RenderBlock } from '../../utils/agentTrace';
import { formatMessageTime } from '../../utils/messageTime';
import AgentItemCard from '../AgentItemCard/AgentItemCard';
import CodeMessage from '../CodeMessage/CodeMessage';
import { DiffBaselineContext } from '../DiffBaselineContext';
import ExplanationMessage from '../ExplanationMessage/ExplanationMessage';
import { MessageGroupStyled } from '../Messages.styled';
import ThinkingMessage from '../ThinkingMessage/ThinkingMessage';
import ToolCallGroup from '../ToolCallGroup/ToolCallGroup';

type MessageBlockProps = {
  block: RenderBlock;
  /** Earlier SQL answer this one is compared against. */
  baseline: string | undefined;
  showModelLabel: boolean;
};

/**
 * One finished piece of the conversation. Memoised on purpose: while an answer
 * streams, only the live block changes, so the history is not rendered again
 * for every token.
 */
const MessageBlock = memo(function MessageBlock({ block, baseline, showModelLabel }: MessageBlockProps): JSX.Element {
  if (block.kind === 'message') {
    const { message } = block;

    return (
      <MessageGroupStyled title={formatMessageTime(message.createdAt)} data-testid='ai-message'>
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
          {message.type === 'code' ? <CodeMessage message={message} /> : <ExplanationMessage message={message} />}
        </DiffBaselineContext>
      </MessageGroupStyled>
    );
  }

  return (
    <MessageGroupStyled>
      {block.thinking?.content && (
        <ThinkingMessage content={block.thinking.content} durationMs={block.thinking.durationMs} defaultCollapsed />
      )}
      {block.kind === 'tools' ? <ToolCallGroup items={block.items} /> : <AgentItemCard item={block.item} />}
    </MessageGroupStyled>
  );
});

export default MessageBlock;
