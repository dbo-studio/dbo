import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { TabMode } from '@/core/enums';
import useNavigate from '@/hooks/useNavigate.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Grid2, IconButton, Stack } from '@mui/material';
import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConnectionBox from './ConnectionBox/ConnectionBox.tsx';

const Databases = lazy(() => import('@/components/common/Databases/Databases'));
const Settings = lazy(() => import('@/components/common/Settings/Settings.tsx'));

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

  const changeSearchParams = (key: string) => {
    searchParams.set(key, 'true');
    setSearchParams(searchParams);
  };

  return (
    <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
      <Suspense>
        <Databases open={searchParams.get('showSelectDatabase') === 'true'} />
      </Suspense>
      <Suspense>
        <Settings open={searchParams.get('showSettings') === 'true'} />
      </Suspense>
      <Grid2 size={{ md: 4 }}>
        <Stack direction={'row'} justifyContent='flex-end'>
          <IconButton aria-label='connections' onClick={() => changeSearchParams('showAddConnection')}>
            <CustomIcon type={'connection'} size={'m'} />
          </IconButton>
          {/* <IconButton aria-label='lock'>
            <CustomIcon type={'lock'} size={'m'} />
          </IconButton> */}
          <IconButton
            disabled={!currentConnection}
            aria-label='databases'
            onClick={() => changeSearchParams('showSelectDatabase')}
          >
            <CustomIcon type={'databaseOutline'} size={'m'} />
          </IconButton>
        </Stack>
      </Grid2>
      <Grid2 mr={1} ml={1} size={{ md: 8 }}>
        <ConnectionBox />
      </Grid2>

      <Grid2 size={{ md: 4 }}>
        <Stack direction={'row'}  justifyContent='flex-start'>
          {/* <IconButton aria-label='search'>
            <CustomIcon type={'search'} size={'m'} />
          </IconButton> */}
          <IconButton disabled={!currentConnection} aria-label='sql' onClick={handleAddEditorTab}>
            <CustomIcon type={'sql'} size={'m'} />
          </IconButton>
        </Stack>
      </Grid2>
    </Stack>
  );
}
