import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import LoadingIconButton from '@/components/base/LoadingIconButton/LoadingIconButton.tsx';
import { TabMode } from '@/core/enums';
import useAPI from '@/hooks/useApi.hook.ts';
import useNavigate from '@/hooks/useNavigate.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Grid2, IconButton, Stack } from '@mui/material';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ConnectionBox from './ConnectionBox/ConnectionBox.tsx';
import Databases from '@/components/common/Databases/Databases.tsx';
import Settings from '@/components/common/Settings/Settings.tsx';

export default function ConnectionInfo() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentConnection, loading, updateLoading, updateCurrentConnection } = useConnectionStore();
  const { addTab } = useTabStore();

  const { request: getConnectionDetail, pending } = useAPI({
    apiMethod: api.connection.getConnectionDetail
  });

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

  const handleRefresh = () => {
    if (!currentConnection) {
      return;
    }
    updateLoading('loading');
    getConnectionDetail({
      connectionID: currentConnection?.id,
      fromCache: false
    })
      .then((res) => {
        updateCurrentConnection(res);
        updateLoading('finished');
      })
      .catch((e) => {
        updateLoading('error');
        if (axios.isAxiosError(e)) {
          toast.error(e.message);
        }
        console.log('🚀 ~ handleRefresh ~ err:', e);
      });
  };

  return (
    <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
      <Databases open={searchParams.get('showSelectDatabase') === 'true'} />
      <Settings open={searchParams.get('showSettings') === 'true'} />
      <Grid2 size={{ md: 3 }}>
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

      <Grid2 size={{ md: 3 }}>
        <Stack direction={'row'} justifyContent='flex-start'>
          <LoadingIconButton
            aria-label={'refresh'}
            onClick={handleRefresh}
            loading={pending}
            disabled={loading === 'loading'}
          >
            <CustomIcon type={'refresh'} />
          </LoadingIconButton>
          <IconButton aria-label={'sql'} disabled={!currentConnection} onClick={handleAddEditorTab}>
            <CustomIcon type={'sql'} size={'m'} />
          </IconButton>
        </Stack>
      </Grid2>
    </Stack>
  );
}
