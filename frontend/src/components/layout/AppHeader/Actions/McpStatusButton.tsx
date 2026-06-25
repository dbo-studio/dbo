import api from '@/api';
import type { McpStatus } from '@/api/mcp';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
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
  const updateUI = useSettingStore((state) => state.updateUI);

  const { data: status } = useQuery({
    queryKey: ['mcp-status'],
    queryFn: api.mcp.getStatus,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true
  });

  const iconColor = getMcpStatusColor(status, {
    disabled: theme.palette.text.disabled,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main
  });

  const openAiSettings = (): void => {
    updateUI({
      showSettings: {
        open: true,
        tab: AI_SETTINGS_TAB,
        aiTab: 'mcp'
      }
    });
  };

  return (
    <Tooltip title={getMcpStatusTooltip(status)}>
      <IconButton aria-label='mcp-status' onClick={openAiSettings}>
        <CustomIcon type='network' size='m' color={iconColor} />
      </IconButton>
    </Tooltip>
  );
}
