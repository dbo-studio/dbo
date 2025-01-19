import Modal from '@/components/base/Modal/Modal';
import General from '@/components/common/Settings/General/General.tsx';
import locales from '@/locales';
import {Grid2, useTheme} from '@mui/material';
import {type JSX, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import AboutPanel from './AboutPanel/AboutPanel';
import MenuPanel from './MenuPanel/MenuPanel';
import ShortcutPanel from './ShortcutPanel/ShortcutPanel';
import ThemePanel from './ThemePanel/ThemePanel';
import type {MenuPanelTabType} from './types';

const tabs: MenuPanelTabType[] = [
  {
    id: 0,
    name: locales.general,
    onlyDesktop: true,
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

export default function Settings({ open }: { open: boolean }) {
  const [content, setContent] = useState<JSX.Element>();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();

  function handleOnClose(): void {
    searchParams.delete('showSettings');
    setSearchParams(searchParams);
  }

  return (
    <Modal open={open} padding='0px' onClose={handleOnClose}>
      <Grid2 width='850px' container spacing={0} flex={1}>
        <Grid2 size={{ md: 3 }} display={'flex'} flexDirection={'column'}>
          <MenuPanel tabs={tabs} onChange={(c) => setContent(c)} />
        </Grid2>
        <Grid2 size={{ md: 9 }} flex={1} p={theme.spacing(2)}>
          {content}
        </Grid2>
      </Grid2>
    </Modal>
  );
}
