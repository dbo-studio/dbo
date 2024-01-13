import ConnectionBox from '@/src/components/common/ConnectionInfo/ConnectionBox';
import { IconButton, Stack } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function ConnectionInfo() {
  return (
    <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
      <Grid md={4}>
        <Stack direction={'row'} spacing={2} justifyContent='flex-end'>
          <IconButton aria-label='connection'>
            <CustomIcon type={'connection'} size={'m'} />
          </IconButton>
          <IconButton aria-label='lock'>
            <CustomIcon type={'lock'} size={'m'} />
          </IconButton>
          <IconButton aria-label='database'>
            <CustomIcon type={'databaseOutline'} size={'m'} />
          </IconButton>
        </Stack>
      </Grid>
      <Grid md={8} mx={2}>
        <ConnectionBox />
      </Grid>

      <Grid md={4}>
        <Stack direction={'row'} spacing={2} justifyContent='flex-start'>
          <IconButton aria-label='refresh'>
            <CustomIcon type={'refresh'} size={'m'} />
          </IconButton>
          <IconButton aria-label='search'>
            <CustomIcon type={'search'} size={'m'} />
          </IconButton>
          <IconButton aria-label='sql'>
            <CustomIcon type={'sql'} size={'m'} />
          </IconButton>
        </Stack>
      </Grid>
    </Stack>
  );
}
