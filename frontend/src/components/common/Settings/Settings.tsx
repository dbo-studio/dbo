import Modal from '@/components/base/Modal/Modal';
import General from '@/components/common/Settings/General/General.tsx';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid, useTheme } from '@mui/material';
import { type JSX, useState } from 'react';
import AboutPanel from './AboutPanel/AboutPanel';
import MenuPanel from './MenuPanel/MenuPanel';
import ShortcutPanel from './ShortcutPanel/ShortcutPanel';
import ThemePanel from './ThemePanel/ThemePanel';
import type { MenuPanelTabType } from './types';

const tabs: MenuPanelTabType[] = [
  {
    id: 0,
    name: locales.general,
    onlyDesktop: false,
    icon: 'settings',
    content: <General />
  },
  {
    id: 1,
    name: locales.theme,
    onlyDesktop: false,
    icon: 'theme',
    content: <ThemePanel />
  },
  {
    id: 2,
    name: locales.shortcuts,
    onlyDesktop: false,
    icon: 'shortcuts',
    content: <ShortcutPanel />
  },
  // {
  //   id: 2,
  //   name: locales.update,
  //   onlyDesktop: true,
  //   icon: 'update',
  //   content: <UpdatePanel />
  // },
  {
    id: 3,
    name: locales.about,
    onlyDesktop: false,
    icon: 'about',
    content: <AboutPanel />
  }
];

export default function Settings({ open }: { open: boolean }): JSX.Element {
  const [content, setContent] = useState<JSX.Element>();
  const theme = useTheme();
  const toggleShowSettings = useSettingStore((state) => state.toggleShowSettings);

  function handleOnClose(): void {
    toggleShowSettings(false);
  }

  return (
    <Modal open={open} padding='0px' onClose={handleOnClose}>
      <Grid width='850px' container spacing={0} flex={1}>
        <Grid size={{ md: 3 }} display={'flex'} flexDirection={'column'}>
          <MenuPanel tabs={tabs} onChange={(c): void => setContent(c)} />
        </Grid>
        <Grid size={{ md: 9 }} flex={1} p={theme.spacing(2)}>
          {content}
        </Grid>
      </Grid>
    </Modal>
  );
}
