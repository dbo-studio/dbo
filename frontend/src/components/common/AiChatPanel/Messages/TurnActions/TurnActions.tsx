import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { AiMessageType } from '@/types';
import { IconButton, Stack, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import { isTraceMessage } from '../../utils/agentTrace';

/** Copy / Regenerate under the latest assistant turn. */
export default function TurnActions({
  turn,
  onRegenerate
}: {
  turn: AiMessageType[];
  onRegenerate?: () => void;
}): JSX.Element {
  const [, copy] = useCopyToClipboard();
  const text = turn
    .filter((message) => !isTraceMessage(message))
    .map((message) => (message.type === 'code' ? `\`\`\`${message.language}\n${message.content}\n\`\`\`` : message.content))
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
    </Stack>
  );
}
