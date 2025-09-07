import { AppHeaderStyled } from '@/components/layout/AppHeader/AppHeader.styled.ts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid, type Theme, useMediaQuery } from '@mui/material';
import type { JSX } from 'react';
import Actions from './Actions/Actions.tsx';
import ConnectionInfo from './ConnectionInfo/ConnectionInfo';
import Leading from './Leading/Leading.tsx';

export default function AppHeader(): JSX.Element {
  const matches = useMediaQuery((theme: Theme) => theme.breakpoints.up('sm'));
  const titleBar = useSettingStore((state) => state.titleBar);

  const onClick = async () => titleBar.onHeaderAreaClick();

  return (
    <AppHeaderStyled className={'app-header'} container spacing={0} justifyContent={'space-between'}
      style={{ backgroundColor: "transparent", backdropFilter: "blur(15px)", WebkitBackdropFilter: "blur(15px)", paddingLeft: titleBar.paddingLeft, paddingTop: titleBar.paddingTop }}
      onMouseDown={onClick}>
      <Grid size={{ md: 2 }} display={matches ? 'flex' : 'none'} justifyContent={'flex-start'}>
        <Leading />
      </Grid>
      <Grid size={{ md: 8 }}>
        <ConnectionInfo />
      </Grid>
      <Grid size={{ md: 2 }} display={matches ? 'flex' : 'none'} justifyContent={'flex-end'}>
        <Actions />
      </Grid>
    </AppHeaderStyled>
  );
}
