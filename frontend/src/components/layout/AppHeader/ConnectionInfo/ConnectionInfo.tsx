import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import LoadingIconButton from '@/components/base/LoadingIconButton/LoadingIconButton.tsx';
import Settings from '@/components/common/Settings/Settings';
import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useCurrentConnection, useShortcut } from '@/hooks';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store.ts';
import { Grid, IconButton, Stack } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import ConnectionBox from './ConnectionBox/ConnectionBox';

export default function ConnectionInfo(): JSX.Element {
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const loading = useConnectionStore((state) => state.loading);

  const showSettings = useSettingStore((state) => state.showSettings);
  const toggleShowAddConnection = useSettingStore((state) => state.toggleShowAddConnection);

  const runQuery = useDataStore((state) => state.runQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  useShortcut(shortcuts.reloadTab, () => handleRefresh());

  const handleAddEditorTab = (): void => {
    const tab = addEditorTab();
    updateSelectedTab(tab);
  };

  const handleRefresh = (): void => {
    const selectedTab = useTabStore.getState().selectedTab();

    queryClient.invalidateQueries({
      queryKey: ['connections']
    });

    if (!currentConnection) {
      return;
    }

    reloadTree();

    if (!selectedTab) return;

    if (selectedTab?.mode === TabMode.Query) {
      runRawQuery();
      return;
    }

    if (selectedTab?.mode === TabMode.Data) {
      runQuery();
    }
  };

  return (
    <Stack direction={'row'} justifyContent={'center'} alignItems={'center'}>
      <Settings open={showSettings} />
      <Grid size={{ md: 3 }}>
        <Stack direction={'row'} justifyContent='flex-end'>
          <IconButton aria-label='connections' onClick={(): void => toggleShowAddConnection(true)}>
            <CustomIcon type={'connection'} size={'m'} />
          </IconButton>
          {/* <IconButton aria-label='lock'>
            <CustomIcon type={'lock'} size={'m'} />
          </IconButton> */}
        </Stack>
      </Grid>
      <Grid mr={1} ml={1} size={{ md: 8 }}>
        <ConnectionBox />
      </Grid>

      <Grid size={{ md: 3 }}>
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
      </Grid>
    </Stack>
  );
}
