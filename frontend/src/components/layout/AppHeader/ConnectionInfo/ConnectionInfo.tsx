import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import useNavigate from '@/hooks/useNavigate.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton, Stack } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConnectionBox from './ConnectionBox';

const Databases = lazy(() => import('./../../../common/Databases/Databases'));

export default function ConnectionInfo() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { currentConnection } = useConnectionStore();
  const { addTab } = useTabStore();

  const handleAddEditorTab = () => {
    const tab = addTab('Editor', TabMode.Query);
    navigate({
      route: 'query',
      tabId: tab.id
    });
  };

  return (
    <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
      <Suspense>
        <Databases open={searchParams.get('showSelectDatabase') === 'true'} />
      </Suspense>
      <Grid md={4}>
        <Stack direction={'row'} spacing={2} justifyContent='flex-end'>
          <IconButton
            aria-label='connections'
            onClick={() => setSearchParams({ ...searchParams, showAddConnection: 'true' })}
          >
            <CustomIcon type={'connection'} size={'m'} />
          </IconButton>
          {/* <IconButton aria-label='lock'>
            <CustomIcon type={'lock'} size={'m'} />
          </IconButton> */}
          <IconButton
            disabled={!currentConnection}
            aria-label='databases'
            onClick={() => setSearchParams({ ...searchParams, showSelectDatabase: 'true' })}
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
