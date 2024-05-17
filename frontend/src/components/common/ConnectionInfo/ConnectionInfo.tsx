import ConnectionBox from '@/src/components/common/ConnectionInfo/ConnectionBox';
import { TabMode } from '@/src/core/enums';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { IconButton, Stack } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import dynamic from 'next/dynamic';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

const Databases = dynamic(() => import('../Databases/Databases'), {
  ssr: false
});

export default function ConnectionInfo() {
  const { updateShowAddConnection, showSelectDatabase, updateShowSelectDatabase, currentConnection } =
    useConnectionStore();

  const { addTab } = useTabStore();

  const handleAddEditorTab = () => {
    addTab('Editor', TabMode.Query);
  };

  return (
    <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
      <Databases open={showSelectDatabase} />
      <Grid md={4}>
        <Stack direction={'row'} spacing={2} justifyContent='flex-end'>
          <IconButton aria-label='connection' onClick={() => updateShowAddConnection(true)}>
            <CustomIcon type={'connection'} size={'m'} />
          </IconButton>
          {/* <IconButton aria-label='lock'>
            <CustomIcon type={'lock'} size={'m'} />
          </IconButton> */}
          <IconButton
            disabled={!currentConnection}
            aria-label='database'
            onClick={() => updateShowSelectDatabase(!showSelectDatabase)}
          >
            <CustomIcon type={'databaseOutline'} size={'m'} />
          </IconButton>
        </Stack>
      </Grid>
      <Grid md={8} mx={2}>
        <ConnectionBox />
      </Grid>

      <Grid md={4}>
        <Stack direction={'row'} spacing={2} justifyContent='flex-start'>
          {/* <IconButton aria-label='search'>
            <CustomIcon type={'search'} size={'m'} />
          </IconButton> */}
          <IconButton aria-label='sql' onClick={handleAddEditorTab}>
            <CustomIcon type={'sql'} size={'m'} />
          </IconButton>
        </Stack>
      </Grid>
    </Stack>
  );
}
