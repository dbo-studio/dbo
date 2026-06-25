import locales from '@/locales';
import { Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import { AiPanelTabsStyled } from './AiPanel.styled';
import AiProvidersPanel from './AiProvidersPanel/AiProvidersPanel';
import McpPanel from './McpPanel/McpPanel';

type AiSettingsTab = 'providers' | 'mcp';

export default function AiPanel() {
  const [tab, setTab] = useState<AiSettingsTab>('providers');

  return (
    <>
      <AiPanelTabsStyled>
        <Tabs value={tab} onChange={(_, value: AiSettingsTab) => setTab(value)} variant='fullWidth'>
          <Tab value='providers' label={locales.ai_tab_providers} />
          <Tab value='mcp' label={locales.ai_tab_mcp} />
        </Tabs>
      </AiPanelTabsStyled>

      {tab === 'providers' ? <AiProvidersPanel /> : <McpPanel />}
    </>
  );
}
