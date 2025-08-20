import { AppHeaderStyled } from '@/components/layout/AppHeader/AppHeader.styled.ts';
import { Grid, type Theme, useMediaQuery } from '@mui/material';
import type { JSX } from 'react';
import Actions from './Actions/Actions.tsx';
import ConnectionInfo from './ConnectionInfo/ConnectionInfo';
import Leading from './Leading/Leading.tsx';

export default function AppHeader(): JSX.Element {
  const matches = useMediaQuery((theme: Theme) => theme.breakpoints.up('sm'));

  return (
    <AppHeaderStyled className={'app-header'} container spacing={0} justifyContent={'space-between'}>
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
