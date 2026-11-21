import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Chip, Tooltip, useTheme } from '@mui/material';
import type { JSX } from 'react';

/** The connection's Safe Mode level, shown in the chat header when it limits what the agent may do. */
export default function SafeModeBadge(): JSX.Element | null {
  const theme = useTheme();
  const safeMode = useConnectionStore((state) => state.currentConnection()?.safeMode);
  if (!safeMode || safeMode === 'silent') return null;

  const guarded = safeMode === 'safe' || safeMode === 'safe_write';

  return (
    <Tooltip title={locales.ai_safe_mode_badge_desc} enterDelay={700}>
      <Chip
        data-testid='ai-safe-mode-badge'
        icon={
          <CustomIcon type='lock' size='xs' color={guarded ? theme.palette.error.main : theme.palette.warning.main} />
        }
        label={locales[`safe_mode_${safeMode}`]}
        color={guarded ? 'error' : 'warning'}
        sx={{ flexShrink: 0 }}
      />
    </Tooltip>
  );
}