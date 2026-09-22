import SidebarSectionTabs from '@/components/base/SidebarSectionTabs/SidebarSectionTabs';
import { canManageAiSettings, canManageMcpSettings } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useMemo, useState } from 'react';
import AiProvidersPanel from './AiProvidersPanel/AiProvidersPanel';
import McpPanel from './McpPanel/McpPanel';
import type { AiPanelProps, AiSettingsTab } from '../types';

export default function AiPanel({ initialTab = 'providers' }: AiPanelProps) {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAi = canManageAiSettings(mode, user);
  const canMcp = canManageMcpSettings(mode, user);

  const sectionTabs = useMemo(() => {
    const tabs: { id: AiSettingsTab; label: string }[] = [];
    if (canAi) {
      tabs.push({ id: 'providers', label: locales.ai_tab_providers });
    }
    if (canMcp) {
      tabs.push({ id: 'mcp', label: locales.ai_tab_mcp });
    }
    return tabs;
  }, [canAi, canMcp]);

  const defaultTab = sectionTabs.some((tab) => tab.id === initialTab)
    ? initialTab
    : (sectionTabs[0]?.id ?? 'providers');

  const [tab, setTab] = useState<AiSettingsTab>(defaultTab);

  if (sectionTabs.length === 0) {
    return null;
  }

  return (
    <>
      {sectionTabs.length > 1 ? (
        <SidebarSectionTabs value={tab} onChange={setTab} tabs={sectionTabs} aria-label={locales.ai_settings} />
      ) : null}

      {tab === 'providers' && canAi ? <AiProvidersPanel /> : null}
      {tab === 'mcp' && canMcp ? <McpPanel /> : null}
    </>
  );
}
