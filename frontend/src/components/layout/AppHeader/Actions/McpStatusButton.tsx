import api from '@/api';
import type { McpStatus } from '@/api/mcp';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { openSettings } from '@/core/settings/openSettings';
import locales from '@/locales';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';

const AI_SETTINGS_TAB = 3;

function getMcpStatusColor(
  status: McpStatus | undefined,
  colors: { disabled: string; success: string; warning: string }
): string {
  if (!status?.enabled) {
    return colors.disabled;
  }

  return status.healthy ? colors.success : colors.warning;
}

function getMcpStatusTooltip(status: McpStatus | undefined): string {
  if (!status?.enabled) {
    return locales.mcp_header_off;
  }

  return status.healthy ? locales.mcp_header_on : locales.mcp_header_unhealthy;
}

export default function McpStatusButton(): JSX.Element {
  const theme = useTheme();

  const { data: status } = useQuery({
    queryKey: ['mcp-status'],
    queryFn: api.mcp.getStatus,
    refetchOnWindowFocus: true
  });

  const iconColor = getMcpStatusColor(status, {
    disabled: theme.palette.text.disabled,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main
  });

  return (
    <Tooltip title={getMcpStatusTooltip(status)}>
      <IconButton
        aria-label='mcp-status'
        onClick={(): void => openSettings({ section: AI_SETTINGS_TAB, aiTab: 'mcp' })}
      >
        <CustomIcon type='network' size='m' color={iconColor} />
      </IconButton>
    </Tooltip>
  );
}
