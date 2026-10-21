import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, CircularProgress, Tooltip } from '@mui/material';
import { VisuallyHidden } from './Providers/Providers.styled';
import type { JSX } from 'react';
import { contextWindowOf, estimateContextTokens, formatTokens } from '../utils/contextBudget';

/** Rough size of what the next message sends, next to the send button. */
export default function ContextBudget(): JSX.Element {
  const context = useAiStore((state) => state.context);
  const activeProvider = useAiStore((state) => state.providers?.find((item) => item.isActive));
  const used = estimateContextTokens(context);
  const limit = contextWindowOf(activeProvider);

  const label = locales.ai_context_budget.replace('{used}', formatTokens(used)).replace('{limit}', formatTokens(limit));
  const ratio = Math.min(used / limit, 1);

  return (
    <Tooltip title={`${label} · ${locales.ai_context_budget_desc}`} enterDelay={500}>
      {/* A ring like Cursor's context meter; the numbers are in the tooltip. */}
      <Box
        sx={{ display: 'inline-flex', position: 'relative', flexShrink: 0, alignSelf: 'center' }}
        data-testid='ai-context-budget'
      >
        <CircularProgress
          variant='determinate'
          value={100}
          size={14}
          thickness={5}
          sx={{ color: 'divider', position: 'absolute' }}
        />
        <CircularProgress
          variant='determinate'
          value={Math.max(ratio * 100, 4)}
          size={14}
          thickness={5}
          color={ratio > 0.8 ? 'warning' : 'primary'}
        />
        <VisuallyHidden>{label}</VisuallyHidden>
      </Box>
    </Tooltip>
  );
}
