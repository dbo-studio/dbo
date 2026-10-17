import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { AiChatMode } from '@/types';
import { Chip, ToggleButton, ToggleButtonGroup, Tooltip, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { useAiChatMode } from '../hooks/useAiChatMode';
import { ModeBarStyled } from './ModeBar.styled';
import { variables } from '@/core/theme/variables';

/** Ask/Agent switch plus the connection's Safe Mode badge, always visible above the thread. */
export default function ModeBar(): JSX.Element {
  const theme = useTheme();
  const [mode, setMode] = useAiChatMode();
  const safeMode = useConnectionStore((state) => state.currentConnection()?.safeMode);
  const guarded = safeMode === 'safe' || safeMode === 'safe_write';

  return (
    <ModeBarStyled>
      <ToggleButtonGroup
        exclusive
        size='small'
        value={mode}
        onChange={(_event, next: AiChatMode | null) => next && setMode(next)}
        aria-label={locales.ai_mode}
        data-testid='ai-mode-toggle'
      >
        <ToggleButton value='ask' title={locales.ai_mode_ask_desc} data-testid='ai-mode-ask'>
          {locales.ai_mode_ask}
        </ToggleButton>
        <ToggleButton value='agent' title={locales.ai_mode_agent_desc} data-testid='ai-mode-agent'>
          {locales.ai_mode_agent}
        </ToggleButton>
      </ToggleButtonGroup>
      {safeMode && safeMode !== 'silent' && (
        <Tooltip title={locales.ai_safe_mode_badge_desc}>
          <Chip
            size='small'
            variant='outlined'
            data-testid='ai-safe-mode-badge'
            icon={
              <CustomIcon
                type='lock'
                size='xs'
                color={guarded ? theme.palette.error.main : theme.palette.warning.main}
              />
            }
            label={locales[`safe_mode_${safeMode}`]}
            color={guarded ? 'error' : 'warning'}
            sx={{ height: 22, fontSize: variables.fontSize.xs }}
          />
        </Tooltip>
      )}
    </ModeBarStyled>
  );
}
