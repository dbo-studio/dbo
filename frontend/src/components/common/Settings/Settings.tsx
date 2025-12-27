import Modal from '@/components/base/Modal/Modal';
import GeneralPanel from '@/components/common/Settings/GeneralPanel/GeneralPanel';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import AboutPanel from './AboutPanel/AboutPanel';
import AiPanel from './AiPanel/AiPanel';
import AppearancePanel from './AppearancePanel/AppearancePanel';
import MenuPanel from './MenuPanel/MenuPanel';
import { SettingsContentStyled } from './Setting.styled';
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
    name: 'AI',
    onlyDesktop: false,
    icon: 'about',
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

export default function Settings({ open, tab }: SettingsProps): JSX.Element {
  const [content, setContent] = useState<JSX.Element>();
  const theme = useTheme();
  const updateUI = useSettingStore((state) => state.updateUI);

  function handleOnClose(): void {
    updateUI({ showSettings: { open: false, tab: 0 } });
  }

  return (
    <Modal open={open} padding='0px' onClose={handleOnClose}>
      <Grid width='850px' container spacing={0} flex={1}>
        <Grid size={{ md: 3 }} display={'flex'} flexDirection={'column'}>
          <MenuPanel tabs={tabs} onChange={(c): void => setContent(c)} defaultTabId={tab} />
        </Grid>
        <SettingsContentStyled size={{ md: 9 }} flex={1} p={theme.spacing(2)}>
          {content}
        </SettingsContentStyled>
      </Grid>
    </Modal>
  );
}
