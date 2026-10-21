import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Tooltip, Typography } from '@mui/material';
import type { JSX } from 'react';
import { contextWindowOf, estimateContextTokens, formatTokens } from '../utils/contextBudget';

/** Rough size of what the next message sends, next to the send button. */
export default function ContextBudget(): JSX.Element {
  const context = useAiStore((state) => state.context);
  const activeProvider = useAiStore((state) => state.providers?.find((item) => item.isActive));
  const used = estimateContextTokens(context);
  const limit = contextWindowOf(activeProvider);

  return (
    <Tooltip title={locales.ai_context_budget_desc} enterDelay={700} enterNextDelay={700}>
      <Typography
        variant='caption'
        color={used / limit > 0.8 ? 'warning.main' : 'textSubdued'}
        sx={{ whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'center' }}
        data-testid='ai-context-budget'
      >
        {locales.ai_context_budget.replace('{used}', formatTokens(used)).replace('{limit}', formatTokens(limit))}
      </Typography>
    </Tooltip>
  );
}
