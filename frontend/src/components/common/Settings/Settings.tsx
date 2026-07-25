import Modal from '@/components/base/Modal/Modal';
import GeneralPanel from '@/components/common/Settings/GeneralPanel/GeneralPanel';
import { useLayoutMode } from '@/hooks';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Divider, Grid, Tab, Tabs, Typography, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import AboutPanel from './AboutPanel/AboutPanel';
import AiPanel from './AiPanel/AiPanel';
import AppearancePanel from './AppearancePanel/AppearancePanel';
import MenuPanel from './MenuPanel/MenuPanel';
import { SettingsContentGridStyled, SettingsContentStyled } from './Setting.styled';
import ShortcutPanel from './ShortcutPanel/ShortcutPanel';
import type { MenuPanelTabType, SettingsProps } from './types';

const tabs: MenuPanelTabType[] = [
  {
    id: 0,
    name: locales.general,
    onlyDesktop: false,
    icon: 'settings',
    content: <GeneralPanel />
  },
  {
    id: 1,
    name: locales.appearance,
    description: locales.appearance_description,
    onlyDesktop: false,
    icon: 'theme',
    content: <AppearancePanel />
  },
  {
    id: 2,
    name: locales.shortcuts,
    onlyDesktop: false,
    icon: 'shortcuts',
    content: <ShortcutPanel />
  },
  {
    id: 3,
    name: locales.ai_settings,
    description: locales.ai_settings_description,
    onlyDesktop: false,
    icon: 'bot',
    content: <AiPanel />
  },
  {
    id: 4,
    name: locales.about,
    onlyDesktop: false,
    icon: 'about',
    content: <AboutPanel />
  }
];

export default function Settings({ open }: SettingsProps): JSX.Element {
  const [currentTab, setCurrentTab] = useState<MenuPanelTabType | undefined>();
  const theme = useTheme();
  const { isMobile } = useLayoutMode();
  const showSettings = useSettingStore((state) => state.ui.showSettings);
  const updateUI = useSettingStore((state) => state.updateUI);
  const defaultMenuTab = tabs.find((tab) => tab.id === showSettings.tab) ?? tabs[0];
  const [prevSync, setPrevSync] = useState({ open, tab: showSettings.tab });

  if (open !== prevSync.open || (open && prevSync.tab !== showSettings.tab)) {
    setPrevSync({ open, tab: showSettings.tab });
    if (open) {
      setCurrentTab(defaultMenuTab);
    }
  }

  function handleOnClose(): void {
    updateUI({ showSettings: { open: false, tab: 0, aiTab: undefined } });
  }

  return (
    <Modal open={open} padding='0px' onClose={handleOnClose}>
      <SettingsContentGridStyled container spacing={0} isMobile={isMobile}>
        <Grid
          size={{ md: 3 }}
          sx={{
            display: isMobile ? 'none' : 'flex',
            flexDirection: 'column'
          }}
        >
          <MenuPanel
            key={open ? `settings-${showSettings.tab}` : 'settings-closed'}
            tabs={tabs}
            onChange={(c): void => setCurrentTab(c)}
            defaultTab={open ? defaultMenuTab : currentTab}
          />
        </Grid>
        <SettingsContentStyled
          size={{ md: 9 }}
          sx={{
            flex: 1,
            p: theme.spacing(2),
            minWidth: 0,
            overflow: 'auto'
          }}
        >
          {isMobile && (
            <Tabs
              value={currentTab?.id ?? defaultMenuTab.id}
              onChange={(_, id: number): void => setCurrentTab(tabs.find((tab) => tab.id === id) ?? tabs[0])}
              variant='scrollable'
              scrollButtons='auto'
              sx={{ mb: 2 }}
            >
              {tabs.map((tab) => (
                <Tab key={tab.id} value={tab.id} label={tab.name} />
              ))}
            </Tabs>
          )}
          <Box
            sx={{
              mb: 2
            }}
          >
            <Typography color='textTitle' variant='h6'>
              {currentTab?.name}
            </Typography>
            {currentTab?.description && (
              <Typography color='textText' variant='body2'>
                {currentTab?.description}
              </Typography>
            )}
            <Box
              sx={{
                mt: 1
              }}
            >
              <Divider />
            </Box>
          </Box>
          {currentTab?.id === 3 ? (
            <AiPanel key={showSettings.aiTab ?? 'providers'} initialTab={showSettings.aiTab ?? 'providers'} />
          ) : (
            currentTab?.content
          )}
        </SettingsContentStyled>
      </SettingsContentGridStyled>
    </Modal>
  );
}
