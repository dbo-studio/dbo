import locales from '@/locales';
import type { AiToolStatus } from '@/types';
import { Chip, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { variables } from '@/core/theme/variables';

const COLORS: Record<AiToolStatus, 'default' | 'success' | 'error' | 'warning'> = {
  running: 'default',
  done: 'success',
  error: 'error',
  blocked: 'warning',
  cancelled: 'default'
};

export default function ToolStatusPill({ status }: { status: AiToolStatus }): JSX.Element {
  return (
    <Chip
      size='small'
      variant='outlined'
      color={COLORS[status]}
      label={locales[`ai_tool_status_${status}`]}
      icon={status === 'running' ? <CircularProgress size={10} thickness={6} /> : undefined}
      sx={{ height: 18, fontSize: variables.fontSize.xs, flexShrink: 0, '& .MuiChip-label': { px: 0.75 } }}
    />
  );
}
