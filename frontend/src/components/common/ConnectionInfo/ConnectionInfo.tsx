import ConnectionBox from '@/components/common/ConnectionInfo/ConnectionBox';
import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton, Stack } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

const Databases = lazy(() => import('../Databases/Databases'));

export default function ConnectionInfo() {
  const navigate = useNavigate();
  const { updateShowAddConnection, showSelectDatabase, updateShowSelectDatabase } = useConnectionStore();
  const currentConnection = useCurrentConnection();

  const { addTab } = useTabStore();

  const handleAddEditorTab = () => {
    const tabId = addTab('Editor', TabMode.Query);
    navigate(`/query/${tabId}/${currentConnection?.id}`);
  };

  return (
    <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
      <Suspense>
        <Databases open={showSelectDatabase} />
      </Suspense>
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
          <IconButton disabled={!currentConnection} aria-label='sql' onClick={handleAddEditorTab}>
            <CustomIcon type={'sql'} size={'m'} />
          </IconButton>
        </Stack>
      </Grid>
    </Stack>
  );
}
