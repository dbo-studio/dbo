import SidebarSectionTabs from '@/components/base/SidebarSectionTabs/SidebarSectionTabs';
import locales from '@/locales';
import { useState } from 'react';
import AiProvidersPanel from './AiProvidersPanel/AiProvidersPanel';
import McpPanel from './McpPanel/McpPanel';

type AiSettingsTab = 'providers' | 'mcp';

type AiPanelProps = {
  initialTab?: AiSettingsTab;
};

const sectionTabs = [
  { id: 'providers' as const, label: locales.ai_tab_providers },
  { id: 'mcp' as const, label: locales.ai_tab_mcp }
];

export default function AiPanel({ initialTab = 'providers' }: AiPanelProps) {
  const [tab, setTab] = useState<AiSettingsTab>(initialTab);

  return (
    <>
      <SidebarSectionTabs value={tab} onChange={setTab} tabs={sectionTabs} aria-label={locales.ai_settings} />

      {tab === 'providers' ? <AiProvidersPanel /> : <McpPanel />}
    </>
  );
}
