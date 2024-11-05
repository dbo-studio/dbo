import { Grid2 } from '@mui/material';
import Actions from './Actions';
import ConnectionInfo from './ConnectionInfo/ConnectionInfo';
import Leading from './Leading';

export default function AppHeader() {
  return (
    <Grid2 className={'app-header'} pt={1} pb={1} pr={2} pl={2} container spacing={0} justifyContent={'space-between'}>
      <Grid2 size={{ md: 2 }}>
        <Leading />
      </Grid2>
      <Grid2 size={{ md: 8 }}>
        <ConnectionInfo />
      </Grid2>
      <Grid2 size={{ md: 2 }}>
        <Actions />
      </Grid2>
    </Grid2>
  );
}
