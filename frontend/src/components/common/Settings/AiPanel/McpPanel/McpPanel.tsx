import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import locales from '@/locales';
import { Alert, Box, Button, Chip, FormControlLabel, IconButton, Stack, Switch, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { McpSectionStyled } from '../AiPanel.styled';
import { buildMcpClientConfigs, type McpClientId } from './mcpConfigs';
import {
  McpConfigHeaderStyled,
  McpConfigSectionStyled,
  McpStatusRowStyled,
  McpStatusValueStyled
} from './McpPanel.styled';

function McpStatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <McpStatusRowStyled>
      <Typography color='text.secondary' variant='caption'>
        {label}
      </Typography>
      <McpStatusValueStyled>{children}</McpStatusValueStyled>
    </McpStatusRowStyled>
  );
}

const monoChipSx = {
  maxWidth: '100%',
  height: 'auto',
  '& .MuiChip-label': {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    whiteSpace: 'normal',
    wordBreak: 'break-all',
    py: 0.5
  }
} as const;

export default function McpPanel() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | undefined>();
  const [selectedClient, setSelectedClient] = useState<McpClientId>('cursor');

  const { data: status } = useQuery({
    queryKey: ['mcp-status'],
    queryFn: api.mcp.getStatus
  });

  const updateMutation = useMutation({
    mutationFn: api.mcp.update,
    onSuccess: (res) => {
      setToken(res.enabled ? res.token : undefined);
      void queryClient.invalidateQueries({ queryKey: ['mcp-status'] });
      toast.success(res.enabled ? locales.mcp_enable : locales.mcp_disable);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const regenerateMutation = useMutation({
    mutationFn: api.mcp.regenerateToken,
    onSuccess: (res) => {
      setToken(res.token);
      toast.success(locales.mcp_regenerate_token);
    }
  });

  const clientConfigs = useMemo(() => {
    if (!token) {
      return [];
    }

    return buildMcpClientConfigs(status?.proxyUrl ?? 'http://127.0.0.1:8080/api/mcp', token);
  }, [status?.proxyUrl, token]);

  const selectedConfig = useMemo(
    () => clientConfigs.find((config) => config.id === selectedClient),
    [clientConfigs, selectedClient]
  );

  const clientSelectOptions = useMemo(
    () => [
      { label: locales.mcp_config_cursor, value: 'cursor' as const },
      { label: locales.mcp_config_claude, value: 'claude' as const },
      { label: locales.mcp_config_copilot, value: 'copilot' as const }
    ],
    []
  );

  const handleCopyConfig = (value: string): void => {
    void navigator.clipboard.writeText(value);
    toast.success(locales.copied);
  };

  return (
    <Stack spacing={2} sx={{ pt: 2 }}>
      <Alert severity='warning'>{locales.mcp_security_warning}</Alert>

      <FormControlLabel
        control={
          <Switch
            checked={status?.enabled ?? false}
            disabled={updateMutation.isPending}
            onChange={(_, checked) => {
              void updateMutation.mutateAsync({ enabled: checked });
            }}
          />
        }
        label={locales.mcp_enable}
      />

      {status && (
        <McpSectionStyled>
          <McpStatusRow label={locales.mcp_status_label}>
            <Chip
              size='small'
              color={status.running ? 'success' : 'default'}
              variant={status.running ? 'filled' : 'outlined'}
              label={status.running ? locales.mcp_status_running : locales.mcp_status_stopped}
            />
          </McpStatusRow>

          {status.enabled && (
            <McpStatusRow label={locales.mcp_health_label}>
              <Chip
                size='small'
                color={status.healthy ? 'success' : 'warning'}
                variant='outlined'
                label={status.healthy ? locales.mcp_healthy : locales.mcp_unhealthy}
              />
            </McpStatusRow>
          )}

          <McpStatusRow label={locales.mcp_proxy_label}>
            <Chip size='small' variant='outlined' label={status.proxyUrl} sx={monoChipSx} />
          </McpStatusRow>

          {status.tokenMasked && (
            <McpStatusRow label={locales.mcp_token_label}>
              <Chip size='small' variant='outlined' label={status.tokenMasked} sx={monoChipSx} />
            </McpStatusRow>
          )}

          {!status.healthy && status.enabled && (
            <Alert severity='warning' sx={{ py: 0.5 }}>
              {locales.mcp_unhealthy_hint}
            </Alert>
          )}
        </McpSectionStyled>
      )}

      {status?.enabled && !token && <Alert severity='info'>{locales.mcp_regenerate_to_copy}</Alert>}

      {selectedConfig && (
        <Stack spacing={1.5}>
          <SelectInput
            label={locales.mcp_client_label}
            value={selectedClient}
            options={clientSelectOptions}
            onChange={(option) => {
              const value = (option as SelectInputOption)?.value;
              if (value === 'cursor' || value === 'claude' || value === 'copilot') {
                setSelectedClient(value);
              }
            }}
          />

          <McpConfigSectionStyled>
            <McpConfigHeaderStyled>
              <Box></Box>
              <IconButton
                size='small'
                onClick={() => handleCopyConfig(selectedConfig.value)}
                aria-label={locales.copied}
              >
                <CustomIcon type='copy' size='xs' />
              </IconButton>
            </McpConfigHeaderStyled>

            <SyntaxHighlighter value={selectedConfig.value} lang='json' />
          </McpConfigSectionStyled>
        </Stack>
      )}

      {status?.enabled && (
        <Button variant='outlined' onClick={() => void regenerateMutation.mutateAsync()}>
          {locales.mcp_regenerate_token}
        </Button>
      )}
    </Stack>
  );
}
