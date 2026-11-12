import { canManageAiSettings, canManageMcpSettings } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { AiToolDensity } from '@/store/settingStore/types';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { Box, Typography } from '@mui/material';
import AiAuditPanel from './AiAuditPanel/AiAuditPanel';
import AiProvidersPanel from './AiProvidersPanel/AiProvidersPanel';
import SettingsTabs, { type SettingsSubTab } from '../SettingsTabs/SettingsTabs';
import McpPanel from './McpPanel/McpPanel';
import type { AiPanelProps } from '../types';

const DENSITIES: AiToolDensity[] = ['compact', 'balanced', 'detailed'];
const WIDTHS = ['narrow', 'default', 'wide'] as const;

export default function AiPanel({ initialTab = 'providers' }: AiPanelProps) {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAi = canManageAiSettings(mode, user);
  const canMcp = canManageMcpSettings(mode, user);
  const toolDensity = useSettingStore((state) => state.editor.aiToolDensity ?? 'balanced');
  const updateEditor = useSettingStore((state) => state.updateEditor);
  const chatWidth = useSettingStore((state) => state.editor.aiChatWidth ?? 'default');

  const tabs: SettingsSubTab[] = [
    ...(canAi
      ? [{ id: 'providers', label: locales.ai_providers_heading, ids: ['ai.providers'], content: <AiProvidersPanel /> }]
      : []),
    {
      id: 'chat',
      label: locales.ai_chat_settings_heading,
      content: (
        <Box sx={{ maxWidth: 360 }}>
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
          <Box sx={{ pt: 2 }}>
            <SelectInput
              label={locales.ai_chat_width}
              testId='ai-chat-width'
              value={chatWidth}
              options={WIDTHS.map((value) => ({ value, label: locales[`ai_chat_width_${value}`] }))}
              onChange={(option) =>
                updateEditor({ aiChatWidth: (option as SelectInputOption).value as (typeof WIDTHS)[number] })
              }
            />
          </Box>
        </Box>
      )
    },
    ...(canAi ? [{ id: 'audit', label: locales.ai_audit_heading, content: <AiAuditPanel /> }] : []),
    ...(canMcp ? [{ id: 'mcp', label: locales.ai_mcp_heading, ids: ['ai.mcp'], content: <McpPanel /> }] : [])
  ];

  return <SettingsTabs tabs={tabs} initial={initialTab} />;
}
