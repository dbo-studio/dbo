import { canManageAiSettings, canManageMcpSettings } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { AiToolDensity } from '@/store/settingStore/types';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { Box, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import AiAuditPanel from './AiAuditPanel/AiAuditPanel';
import AiProvidersPanel from './AiProvidersPanel/AiProvidersPanel';
import McpPanel from './McpPanel/McpPanel';
import type { AiPanelProps } from '../types';

const DENSITIES: AiToolDensity[] = ['compact', 'balanced', 'detailed'];

export default function AiPanel({ initialTab = 'providers' }: AiPanelProps) {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAi = canManageAiSettings(mode, user);
  const canMcp = canManageMcpSettings(mode, user);
  const mcpRef = useRef<HTMLDivElement>(null);
  const toolDensity = useSettingStore((state) => state.editor.aiToolDensity ?? 'balanced');
  const updateEditor = useSettingStore((state) => state.updateEditor);

  useEffect(() => {
    if (initialTab === 'mcp') {
      mcpRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [initialTab]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <section aria-label={locales.ai_chat_settings_heading}>
        <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
          {locales.ai_chat_settings_heading}
        </Typography>
        <Box sx={{ pt: 2, maxWidth: 360 }}>
          <SelectInput
            label={locales.ai_tool_density}
            testId='ai-tool-density'
            value={toolDensity}
            options={DENSITIES.map((value) => ({ value, label: locales[`ai_tool_density_${value}`] }))}
            onChange={(option) => updateEditor({ aiToolDensity: (option as SelectInputOption).value as AiToolDensity })}
          />
          <Typography variant='caption' color='textSubdued'>
            {locales.ai_tool_density_desc}
          </Typography>
        </Box>
      </section>
      {canAi ? (
        <section aria-label={locales.ai_providers_heading}>
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {locales.ai_providers_heading}
          </Typography>
          <AiProvidersPanel />
        </section>
      ) : null}
      {canAi ? (
        <section aria-label={locales.ai_audit_heading}>
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {locales.ai_audit_heading}
          </Typography>
          <AiAuditPanel />
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
