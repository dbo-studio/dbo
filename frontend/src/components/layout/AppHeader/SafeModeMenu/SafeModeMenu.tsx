import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSafeModePasswordStore } from '@/store/safeModePassword/safeModePassword.store';
import type { ConnectionSafeMode, ConnectionType } from '@/types';
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useTheme
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, type MouseEvent, useState } from 'react';
import { toast } from 'sonner';

type SafeModeOption = {
  value: ConnectionSafeMode;
  title: string;
  description: string;
  color: string;
  filled: boolean;
  group: 'silent' | 'alert' | 'safe';
};

const MODE_OPTIONS = (colors: { silent: string; alert: string; safe: string }): SafeModeOption[] => [
  {
    value: 'silent',
    title: locales.safe_mode_silent,
    description: locales.safe_mode_silent_desc,
    color: colors.silent,
    filled: true,
    group: 'silent'
  },
  {
    value: 'alert',
    title: locales.safe_mode_alert,
    description: locales.safe_mode_alert_desc,
    color: colors.alert,
    filled: true,
    group: 'alert'
  },
  {
    value: 'alert_write',
    title: locales.safe_mode_alert_write,
    description: locales.safe_mode_alert_write_desc,
    color: colors.alert,
    filled: false,
    group: 'alert'
  },
  {
    value: 'safe',
    title: locales.safe_mode_safe,
    description: locales.safe_mode_safe_desc,
    color: colors.safe,
    filled: true,
    group: 'safe'
  },
  {
    value: 'safe_write',
    title: locales.safe_mode_safe_write,
    description: locales.safe_mode_safe_write_desc,
    color: colors.safe,
    filled: false,
    group: 'safe'
  }
];

function normalizeMode(mode?: string): ConnectionSafeMode {
  switch (mode) {
    case 'alert':
    case 'alert_write':
    case 'safe':
    case 'safe_write':
    case 'silent':
      return mode;
    case 'full':
      return 'alert_write';
    case 'off':
      return 'silent';
    case 'read_only':
    case 'disallow_drop':
      return 'safe_write';
    default:
      return 'silent';
  }
}

async function verifyConnectionPassword(connection: ConnectionType, password: string): Promise<void> {
  await api.connection.pingConnection({
    id: connection.id,
    type: connection.type,
    options: {
      ...connection.options,
      password
    }
  });
}

export default function SafeModeMenu(): JSX.Element {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const updateConnections = useConnectionStore((state) => state.updateConnections);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const { mutateAsync: updateConnection, isPending } = useMutation({
    mutationFn: (safeMode: ConnectionSafeMode) => {
      if (!currentConnection) {
        return Promise.reject(new Error('no connection'));
      }
      return api.connection.updateConnection(currentConnection.id, { safeMode });
    }
  });

  const currentMode = normalizeMode(currentConnection?.safeMode);
  const options = MODE_OPTIONS({
    silent: theme.palette.text.secondary,
    alert: theme.palette.warning.main,
    safe: theme.palette.error.main
  });
  const activeOption = options.find((option) => option.value === currentMode) ?? options[0];
  const isUnlocked = currentMode === 'silent' || Boolean(currentConnection?.safeModeUnlocked);
  const iconColor = isUnlocked ? undefined : activeOption.color;

  const handleOpen = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const applyMode = async (safeMode: ConnectionSafeMode): Promise<void> => {
    if (!currentConnection) return;
    const updated = await updateConnection(safeMode);
    const connections = useConnectionStore.getState().connections;
    if (connections) {
      updateConnections(connections.map((connection) => (connection.id === updated.id ? updated : connection)));
    }
    await queryClient.invalidateQueries({ queryKey: ['connections'] });
    toast.success(locales.safe_mode_updated);
    handleClose();
  };

  const handleSelect = async (safeMode: ConnectionSafeMode): Promise<void> => {
    if (!currentConnection || safeMode === currentMode) {
      handleClose();
      return;
    }

    // Turning Safe Mode off requires database password (TablePlus behavior).
    if (safeMode === 'silent' && currentMode !== 'silent') {
      handleClose();
      const result = await useSafeModePasswordStore.getState().request({
        connectionId: currentConnection.id
      });
      if (!result?.password) {
        return;
      }
      try {
        await verifyConnectionPassword(currentConnection, result.password);
        await applyMode(safeMode);
      } catch (error) {
        console.debug('🚀 ~ SafeModeMenu ~ handleSelect silent:', error);
        toast.error(locales.safe_mode_password_invalid);
      }
      return;
    }

    try {
      await applyMode(safeMode);
    } catch (error) {
      console.debug('🚀 ~ SafeModeMenu ~ handleSelect:', error);
      toast.error(locales.safe_mode_update_failed);
    }
  };

  return (
    <>
      <Tooltip title={locales.safe_mode}>
        <span>
          <IconButton
            aria-label={locales.safe_mode}
            data-testid='safe-mode-menu'
            disabled={!currentConnection || isPending}
            onClick={handleOpen}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {isPending ? (
              <CircularProgress size={18} />
            ) : (
              <CustomIcon type={isUnlocked ? 'lockOpen' : 'lock'} size='m' color={iconColor} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 260,
              maxWidth: 320,
              py: 1
            }
          }
        }}
      >
        {options.map((option, index) => {
          const selected = option.value === currentMode;
          const prev = options[index - 1];
          const showDivider = prev && prev.group !== option.group;
          return (
            <Box key={option.value}>
              {showDivider && <Divider />}
              <MenuItem
                selected={selected}
                data-testid={`safe-mode-option-${option.value}`}
                onClick={() => void handleSelect(option.value)}
                sx={{ alignItems: 'flex-start', py: 1, px: 2 }}
              >
                <ListItemIcon sx={{ mt: 0.5, minWidth: 28 }}>
                  {option.value === 'silent' && selected ? (
                    <CustomIcon type='check' size='s' />
                  ) : (
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: option.filled ? option.color : 'transparent',
                        border: `2px solid ${option.color}`
                      }}
                    />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={option.title}
                  secondary={option.description}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      sx: { fontWeight: selected ? 600 : 400 }
                    },
                    secondary: {
                      variant: 'caption',
                      color: 'text.secondary',
                      sx: { whiteSpace: 'normal' }
                    }
                  }}
                />
              </MenuItem>
            </Box>
          );
        })}
      </Menu>
    </>
  );
}
