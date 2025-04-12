import { AppHeaderStyled } from '@/components/layout/AppHeader/AppHeader.styled.ts';
import { Grid2 } from '@mui/material';
import type { JSX } from 'react';
import Actions from './Actions/Actions.tsx';
import ConnectionInfo from './ConnectionInfo/ConnectionInfo';
import Leading from './Leading/Leading.tsx';

export default function AppHeader(): JSX.Element {
  return (
    <AppHeaderStyled className={'app-header'} container spacing={0} justifyContent={'space-between'}>
      <Grid2 size={{ md: 2 }} display={'flex'} justifyContent={'flex-start'}>
        <Leading />
      </Grid2>
      <Grid2 size={{ md: 8 }}>
        <ConnectionInfo />
      </Grid2>
      <Grid2 size={{ md: 2 }} display={'flex'} justifyContent={'flex-end'}>
        <Actions />
      </Grid2>
    </AppHeaderStyled>
  );
}
