import locales from '@/locales';
import type { AiMessageType } from '@/types';
import { CircularProgress, Typography } from '@mui/material';
import { useMemo, type JSX } from 'react';
import { useAiSession } from '../../hooks/useAiSession';
import { groupLiveItems } from '../../utils/agentTrace';
import AgentItemCard from '../AgentItemCard/AgentItemCard';
import ChatErrorMessage from '../ChatErrorMessage/ChatErrorMessage';
import StreamingPreview from '../StreamingPreview/StreamingPreview';
import ThinkingMessage from '../ThinkingMessage/ThinkingMessage';
import ToolCallGroup from '../ToolCallGroup/ToolCallGroup';
import TurnActions from '../TurnActions/TurnActions';
import { LoadingRowStyled, MessageGroupStyled } from '../Messages.styled';
import type { MessagesProps } from '../../types';

type MessageTailProps = Pick<MessagesProps, 'loading' | 'onRetry' | 'onRegenerate' | 'onCompare' | 'onFeedback'> & {
  lastTurn: AiMessageType[];
  lastPrompt: string;
};

/**
 * The open turn's live stream, spinner, error, and actions.
 * Subscribes to the session on its own so a token does not re-render the history above it.
 */
export default function MessageTail({
  loading,
  lastTurn,
  lastPrompt,
  onRetry,
  onRegenerate,
  onCompare,
  onFeedback
}: MessageTailProps): JSX.Element {
  const { streaming, agentItems } = useAiSession();
  const liveBlocks = useMemo(() => groupLiveItems(agentItems), [agentItems]);

  return (
    <>
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
        <LoadingRowStyled>
          <CircularProgress size={14} thickness={5} />
          <Typography variant='body2' color='textSubdued'>
            {locales.thinking}...
          </Typography>
        </LoadingRowStyled>
      )}

      {streaming.error && onRetry && <ChatErrorMessage message={streaming.error} onRetry={onRetry} />}
    </>
  );
}
