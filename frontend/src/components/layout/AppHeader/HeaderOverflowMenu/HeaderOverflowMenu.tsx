import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { constants } from '@/core/constants';
import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks/useCurrentConnection.hook';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Badge, IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { type JSX, type MouseEvent, useState } from 'react';

const AI_SETTINGS_TAB = 3;

export default function HeaderOverflowMenu(): JSX.Element {
  const queryClient = useQueryClient();
  const currentConnection = useCurrentConnection();
  const loading = useConnectionStore((state) => state.loading);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const release = useSettingStore((state) => state.general.release);
  const updateUI = useSettingStore((state) => state.updateUI);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const toggleLeftSidebar = (): void => {
    const sidebar = useSettingStore.getState().ui.sidebar;
    if (!sidebar.showLeft) {
      updateUI({
        sidebar: { ...sidebar, showLeft: true, showRight: false, leftWidth: constants.defaultSidebarWidth },
        showConnectionsDrawer: false
      });
    } else {
      updateUI({ sidebar: { ...sidebar, showLeft: false } });
    }
    handleClose();
  };

  const toggleRightSidebar = (): void => {
    const sidebar = useSettingStore.getState().ui.sidebar;
    if (!sidebar.showRight) {
      updateUI({
        sidebar: { ...sidebar, showRight: true, showLeft: false, rightWidth: constants.defaultSidebarWidth },
        showConnectionsDrawer: false
      });
    } else {
      updateUI({ sidebar: { ...sidebar, showRight: false } });
    }
    handleClose();
  };

  const openSettings = (): void => {
    updateUI({ showSettings: { open: true, tab: 0 } });
    handleClose();
  };

  const openMcpSettings = (): void => {
    updateUI({
      showSettings: {
        open: true,
        tab: AI_SETTINGS_TAB,
        aiTab: 'mcp'
      }
    });
    handleClose();
  };

  const handleRefresh = async (): Promise<void> => {
    const selectedTab = useTabStore.getState().selectedTab();

    await queryClient.invalidateQueries({
      queryKey: ['connections']
    });

    if (!currentConnection) {
      handleClose();
      return;
    }

    await useTreeStore.getState().reloadTree(false);

    if (selectedTab?.mode === TabMode.Query) {
      await useDataStore.getState().runRawQuery();
    } else if (selectedTab?.mode === TabMode.Data) {
      useDataStore.getState().toggleReRunQuery();
    } else if (selectedTab?.mode === TabMode.Diagram) {
      await queryClient.invalidateQueries({ queryKey: ['schema-diagram'] });
    }

    handleClose();
  };

  const handleAddEditorTab = (): void => {
    useTabStore.getState().addEditorTab();
    handleClose();
  };

  const openConnections = (): void => {
    const ui = useSettingStore.getState().ui;
    updateUI({
      showConnectionsDrawer: !ui.showConnectionsDrawer,
      sidebar: { ...ui.sidebar, showLeft: false, showRight: false }
    });
    handleClose();
  };

  const openAddConnection = (): void => {
    updateUI({ showAddConnection: true, duplicateConnectionId: undefined });
    handleClose();
  };

  return (
    <>
      <IconButton aria-label='header-menu' onClick={handleOpen} onMouseDown={(event) => event.stopPropagation()}>
        <CustomIcon type='ellipsisVertical' size='m' />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => void handleRefresh()} disabled={loading === 'loading' || !currentConnection}>
          <ListItemIcon>
            <CustomIcon type='refresh' size='s' />
          </ListItemIcon>
          <ListItemText>{locales.refresh}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAddEditorTab} disabled={!currentConnection}>
          <ListItemIcon>
            <CustomIcon type='sql' size='s' />
          </ListItemIcon>
          <ListItemText>{locales.open_editor}</ListItemText>
        </MenuItem>
        <MenuItem onClick={openConnections}>
          <ListItemIcon>
            <CustomIcon type='connection' size='s' />
          </ListItemIcon>
          <ListItemText>{locales.connections}</ListItemText>
        </MenuItem>
        <MenuItem onClick={openAddConnection}>
          <ListItemIcon>
            <CustomIcon type='plus' size='s' />
          </ListItemIcon>
          <ListItemText>{locales.new_connection}</ListItemText>
        </MenuItem>
        <MenuItem onClick={toggleLeftSidebar} disabled={!currentConnection}>
          <ListItemIcon>
            <CustomIcon type='sideLeft' size='s' />
          </ListItemIcon>
          <ListItemText>{locales.left_sidebar}</ListItemText>
        </MenuItem>
        <MenuItem onClick={toggleRightSidebar} disabled={!currentConnection}>
          <ListItemIcon>
            <CustomIcon type='sideRight' size='s' />
          </ListItemIcon>
          <ListItemText>{locales.right_sidebar}</ListItemText>
        </MenuItem>
        <MenuItem onClick={openSettings}>
          <ListItemIcon>
            {release ? (
              <Badge variant='dot' color='warning'>
                <CustomIcon type='settings' size='s' />
              </Badge>
            ) : (
              <CustomIcon type='settings' size='s' />
            )}
          </ListItemIcon>
          <ListItemText>{release ? locales.new_version_available : locales.settings}</ListItemText>
        </MenuItem>
        <MenuItem onClick={openMcpSettings}>
          <ListItemIcon>
            <CustomIcon type='network' size='s' />
          </ListItemIcon>
          <ListItemText>{locales.mcp_settings}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
