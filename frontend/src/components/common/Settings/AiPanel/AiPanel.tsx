import { canManageAiSettings, canManageMcpSettings } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import AiProvidersPanel from './AiProvidersPanel/AiProvidersPanel';
import McpPanel from './McpPanel/McpPanel';
import type { AiPanelProps } from '../types';

export default function AiPanel({ initialTab = 'providers' }: AiPanelProps) {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAi = canManageAiSettings(mode, user);
  const canMcp = canManageMcpSettings(mode, user);
  const mcpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTab === 'mcp') {
      mcpRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [initialTab]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {canAi ? (
        <section aria-label={locales.ai_providers_heading}>
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {locales.ai_providers_heading}
          </Typography>
          <AiProvidersPanel />
        </section>
      ) : null}
      {canMcp ? (
        <section ref={mcpRef} aria-label={locales.ai_mcp_heading}>
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {locales.ai_mcp_heading}
          </Typography>
          <McpPanel />
        </section>
      ) : null}
    </Box>
  );
}
