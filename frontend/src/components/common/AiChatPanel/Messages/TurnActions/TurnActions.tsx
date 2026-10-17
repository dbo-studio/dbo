import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { AiMessageType } from '@/types';
import { isProviderReady } from '@/core/ai/aiStatus';
import { useAiStore } from '@/store/aiStore/ai.store';
import { IconButton, ListSubheader, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import { isTraceMessage } from '../../utils/agentTrace';
import FeedbackDialog from '../FeedbackDialog/FeedbackDialog';

/** Copy / Regenerate / Compare under the latest assistant turn. */
export default function TurnActions({
  turn,
  prompt,
  onRegenerate,
  onCompare,
  onFeedback
}: {
  turn: AiMessageType[];
  /** The question the turn answers; shown in the feedback dialog. */
  prompt: string;
  onRegenerate?: () => void;
  onCompare?: (providerId: number, model: string) => void;
  onFeedback?: (rating: 'up' | 'down', comment: string) => Promise<void>;
}): JSX.Element {
  const [, copy] = useCopyToClipboard();
  const providers = useAiStore((state) => state.providers);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<'up' | 'down' | null>(null);
  // Offer every ready model except the one that wrote this answer.
  const answeredBy = [...turn].reverse().find((message) => message.role === 'assistant' && message.model)?.model;
  const active = providers?.find((item) => item.isActive);
  const currentModel = answeredBy ?? active?.model;
  const options = (providers ?? [])
    .filter(isProviderReady)
    .map((provider) => ({ provider, models: provider.models.filter((model) => model !== currentModel) }))
    .filter((option) => option.models.length > 0);
  const rating = [...turn]
    .reverse()
    .find((message) => message.role === 'assistant' && !isTraceMessage(message))?.feedback;
  const answers = turn.filter((message) => message.role === 'assistant' && !isTraceMessage(message));
  const text = turn
    .filter((message) => !isTraceMessage(message))
    .map((message) =>
      message.type === 'code' ? `\`\`\`${message.language}\n${message.content}\n\`\`\`` : message.content
    )
    .join('\n\n');

  return (
    <Stack direction='row' spacing={0.25} sx={{ mt: -0.5 }} data-testid='ai-turn-actions'>
      <Tooltip title={locales.ai_copy_answer}>
        <IconButton size='small' onClick={() => void copy(text).then((ok) => ok && toast.success(locales.copied))}>
          <CustomIcon type='copy' size='xs' />
        </IconButton>
      </Tooltip>
      {onRegenerate && (
        <Tooltip title={locales.ai_regenerate}>
          <IconButton size='small' onClick={onRegenerate} data-testid='ai-regenerate'>
            <CustomIcon type='refresh' size='xs' />
          </IconButton>
        </Tooltip>
      )}
      {onFeedback && (
        <>
          <Tooltip title={locales.ai_feedback_good}>
            <span>
              <IconButton
                size='small'
                color={rating === 'up' ? 'primary' : 'default'}
                aria-pressed={rating === 'up'}
                disabled={rating !== undefined}
                onClick={() => setFeedbackRating('up')}
                data-testid='ai-feedback-up'
              >
                <CustomIcon type='thumbUp' size='xs' />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={locales.ai_feedback_bad}>
            <span>
              <IconButton
                size='small'
                color={rating === 'down' ? 'primary' : 'default'}
                aria-pressed={rating === 'down'}
                disabled={rating !== undefined}
                onClick={() => setFeedbackRating('down')}
                data-testid='ai-feedback-down'
              >
                <CustomIcon type='thumbDown' size='xs' />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}
      {onCompare && options.length > 0 && (
        <>
          <Tooltip title={locales.ai_compare_model}>
            <IconButton size='small' onClick={(event) => setAnchorEl(event.currentTarget)} data-testid='ai-compare'>
              <CustomIcon type='compare' size='xs' />
            </IconButton>
          </Tooltip>
          <Menu open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}>
            {options.flatMap(({ provider, models }) => [
              <ListSubheader key={`h-${provider.id}`} sx={{ lineHeight: '28px', fontSize: '0.6875rem' }}>
                {provider.type}
              </ListSubheader>,
              ...models.map((model) => (
                <MenuItem
                  key={`${provider.id}-${model}`}
                  dense
                  data-testid='ai-compare-option'
                  onClick={() => {
                    setAnchorEl(null);
                    onCompare(provider.id, model);
                  }}
                >
                  <Typography variant='body2' noWrap>
                    {model}
                  </Typography>
                </MenuItem>
              ))
            ])}
          </Menu>
        </>
      )}
      {onFeedback && (
        <FeedbackDialog
          rating={feedbackRating}
          prompt={prompt}
          answer={answers.map((message) => message.content).join('\n\n')}
          onSend={onFeedback}
          onClose={() => setFeedbackRating(null)}
        />
      )}
    </Stack>
  );
}
