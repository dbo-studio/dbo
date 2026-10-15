import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import ModeBar from '@/components/common/AiChatPanel/ModeBar/ModeBar';
import { useSwitchConnection } from '@/hooks/useSwitchConnection';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, Button, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { type JSX, useState } from 'react';
import { WorkspaceTopBarStyled } from './WorkspaceTopBar.styled';

type WorkspaceTopBarProps = {
  onBack: () => void;
  onToggleSessions: () => void;
};

/** Back to the app, sessions toggle, connection switcher, and the Ask/Agent + Safe Mode bar. */
export default function WorkspaceTopBar({ onBack, onToggleSessions }: WorkspaceTopBarProps): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const connections = useConnectionStore((state) => state.connections);
  const current = useConnectionStore((state) => state.currentConnection());
  const { switchConnection, isSwitching } = useSwitchConnection();

  return (
    <WorkspaceTopBarStyled>
      <Button
        size='small'
        color='inherit'
        startIcon={<CustomIcon type='arrowLeft' size='s' />}
        onClick={onBack}
        data-testid='ai-workspace-back'
      >
        {locales.ai_back_to_dbo}
      </Button>
      <Tooltip title={locales.ai_workspace_toggle_sessions}>
        <IconButton size='small' onClick={onToggleSessions} data-testid='ai-workspace-toggle-sessions'>
          <CustomIcon type='sideLeft' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.ai_workspace_switch_connection}>
        <Button
          size='small'
          variant='outlined'
          color='inherit'
          disabled={isSwitching}
          endIcon={<CustomIcon type='chevronDown' size='xs' />}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ textTransform: 'none', maxWidth: 260 }}
          data-testid='ai-workspace-connection'
        >
          <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {current?.name}
          </Box>
        </Button>
      </Tooltip>
      <Menu open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}>
        {(connections ?? []).map((connection) => (
          <MenuItem
            key={connection.id}
            selected={connection.id === current?.id}
            onClick={() => {
              setAnchorEl(null);
              void switchConnection(connection);
            }}
          >
            {connection.name}
          </MenuItem>
        ))}
      </Menu>
      <Box sx={{ flex: 1 }} />
      <ModeBar />
    </WorkspaceTopBarStyled>
  );
}
