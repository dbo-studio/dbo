import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Settings from '@/components/common/Settings/Settings';
import { TabMode } from '@/core/enums';
import { shortcuts } from '@/core/utils';
import { useCurrentConnection, useShortcut } from '@/hooks';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store.ts';
import { Grid, IconButton, Stack, Tooltip } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import ConnectionBox from './ConnectionBox/ConnectionBox';
import { ConnectionInfoStyled } from './ConnectionInfo.styled';

type ConnectionInfoProps = {
  compact?: boolean;
};

export default function ConnectionInfo({ compact = false }: ConnectionInfoProps): JSX.Element {
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const loading = useConnectionStore((state) => state.loading);

  const showSettings = useSettingStore((state) => state.ui.showSettings);
  const updateUI = useSettingStore((state) => state.updateUI);

  const toggleReRunQuery = useDataStore((state) => state.toggleReRunQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const addEditorTab = useTabStore((state) => state.addEditorTab);

  useShortcut(shortcuts.reloadTab, () => void handleRefresh());

  const handleAddEditorTab = (): void => {
    addEditorTab();
  };

  const handleRefresh = async (): Promise<void> => {
    const selectedTab = useTabStore.getState().selectedTab();

    await queryClient.invalidateQueries({
      queryKey: ['connections']
    });

    if (!currentConnection) {
      return;
    }

    await reloadTree(false);

    if (!selectedTab) return;

    if (selectedTab?.mode === TabMode.Query) {
      await runRawQuery();
      return;
    }

    if (selectedTab?.mode === TabMode.Data) {
      toggleReRunQuery();
    }
  };

  return (
    <ConnectionInfoStyled direction={'row'}>
      <Settings open={showSettings.open} />
      {!compact && (
        <Grid size={{ md: 3 }}>
          <Stack
            direction={'row'}
            sx={{
              justifyContent: 'flex-end'
            }}
          >
            <Tooltip title={locales.connections}>
              <IconButton data-testid='add-connection' onClick={(): void => updateUI({ showAddConnection: true })}>
                <CustomIcon type={'connection'} size={'m'} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Grid>
      )}
      <Grid
        size='grow'
        sx={{
          mr: compact ? 0 : 1,
          ml: compact ? 0 : 1,
          minWidth: 0
        }}
      >
        <ConnectionBox />
      </Grid>
      {!compact && (
        <Grid size={{ md: 3 }}>
          <Stack
            direction={'row'}
            sx={{
              justifyContent: 'flex-start'
            }}
          >
            <Tooltip title={locales.refresh}>
              <IconButton
                aria-label={'refresh'}
                onClick={() => void handleRefresh()}
                loading={loading === 'loading'}
                disabled={loading === 'loading'}
              >
                <CustomIcon type={'refresh'} />
              </IconButton>
            </Tooltip>
            <Tooltip title={locales.open_editor}>
              <IconButton aria-label={'sql'} disabled={!currentConnection} onClick={handleAddEditorTab}>
                <CustomIcon type={'sql'} size={'m'} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Grid>
      )}
    </ConnectionInfoStyled>
  );
}
