import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { AiChatMode } from '@/types';
import { Box, Chip, ListItemText, Menu, MenuItem, Tooltip, useTheme } from '@mui/material';
import { useState, type JSX } from 'react';
import { useAiChatMode } from '../hooks/useAiChatMode';
import { ModeButtonStyled } from './ModeBar.styled';
import { variables } from '@/core/theme/variables';

const MODES: { value: AiChatMode; label: string; desc: string; icon: 'message' | 'bot' }[] = [
  { value: 'ask', label: locales.ai_mode_ask, desc: locales.ai_mode_ask_desc, icon: 'message' },
  { value: 'agent', label: locales.ai_mode_agent, desc: locales.ai_mode_agent_desc, icon: 'bot' }
];

/** Ask/Agent picker in the composer footer, next to the model. */
export default function ModeBar(): JSX.Element {
  const [mode, setMode] = useAiChatMode();
  const readOnly = useConnectionStore((state) => state.currentConnection()?.agentTier === 'read_only');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = MODES.find((item) => item.value === mode) ?? MODES[0];

  return (
    <>
      <ModeButtonStyled
        size='small'
        onClick={(event) => setAnchorEl(event.currentTarget)}
        startIcon={<CustomIcon type={current.icon} size='xs' />}
        endIcon={<CustomIcon type='chevronDown' size='xs' />}
        aria-label={locales.ai_mode}
        data-testid='ai-mode-toggle'
        data-mode={mode}
      >
        {current.label}
      </ModeButtonStyled>
      <Menu
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { maxWidth: 280 } } }}
      >
        {MODES.map((item) => (
          <MenuItem
            key={item.value}
            dense
            selected={item.value === mode}
            disabled={item.value === 'agent' && readOnly}
            onClick={() => {
              setMode(item.value);
              setAnchorEl(null);
            }}
            data-testid={`ai-mode-${item.value}`}
            sx={{ alignItems: 'flex-start', gap: 1 }}
          >
            <Box sx={{ pt: 0.25 }}>
              <CustomIcon type={item.icon} size='xs' />
            </Box>
            <ListItemText
              primary={item.label}
              secondary={item.value === 'agent' && readOnly ? locales.ai_mode_agent_blocked : item.desc}
              slotProps={{ secondary: { sx: { whiteSpace: 'normal', fontSize: variables.fontSize.xs } } }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** The connection's Safe Mode level, shown in the chat header when it limits what the agent may do. */
export function SafeModeBadge(): JSX.Element | null {
  const theme = useTheme();
  const safeMode = useConnectionStore((state) => state.currentConnection()?.safeMode);
  if (!safeMode || safeMode === 'silent') return null;

  const guarded = safeMode === 'safe' || safeMode === 'safe_write';

  return (
    <Tooltip title={locales.ai_safe_mode_badge_desc} enterDelay={700}>
      <Chip
        size='small'
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
