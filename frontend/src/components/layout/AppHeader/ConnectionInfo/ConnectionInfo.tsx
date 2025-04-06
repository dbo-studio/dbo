import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import LoadingIconButton from '@/components/base/LoadingIconButton/LoadingIconButton.tsx';
import Settings from '@/components/common/Settings/Settings.tsx';
import { useCurrentConnection } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store.ts';
import { Grid2, IconButton, Stack } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import ConnectionBox from './ConnectionBox/ConnectionBox.tsx';

export default function ConnectionInfo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loading } = useConnectionStore();
  const { addEditorTab } = useTabStore();
  const { reloadTree } = useTreeStore();

  const handleAddEditorTab = () => {
    const tab = addEditorTab();
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

    queryClient.invalidateQueries({
      queryKey: ['connections', currentConnection.id]
    });

    reloadTree();
  };

  return (
    <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
      <Settings open={searchParams.get('showSettings') === 'true'} />
      <Grid2 size={{ md: 3 }}>
        <Stack direction={'row'} justifyContent='flex-end'>
          <IconButton aria-label='connections' onClick={() => changeSearchParams('showAddConnection')}>
            <CustomIcon type={'connection'} size={'m'} />
          </IconButton>
          {/* <IconButton aria-label='lock'>
            <CustomIcon type={'lock'} size={'m'} />
          </IconButton> */}
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
            loading={loading === 'loading'}
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
