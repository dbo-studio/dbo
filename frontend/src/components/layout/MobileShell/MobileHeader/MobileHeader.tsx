import ActionSheet from '@/components/base/ActionSheet/ActionSheet';
import type { MenuType } from '@/components/base/ContextMenu/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import { canCreateConnection, canManageMcpSettings } from '@/core/auth/permissions';
import { getConnectionAlias } from '@/core/db/connectionAliases';
import { openSettings } from '@/core/settings/openSettings';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton } from '@mui/material';
import { type JSX, useState } from 'react';
import SafeModeMenu from '../../AppHeader/SafeModeMenu/SafeModeMenu';
import type { ConnectionStatus } from '../types';
import {
  ConnectionIconStyled,
  ConnectionMetaStyled,
  ConnectionNameStyled,
  ConnectionStatusDotStyled,
  ConnectionSwitcherStyled,
  ConnectionTextStyled,
  MobileHeaderStyled
} from './MobileHeader.styled';

const AI_SETTINGS_TAB = 3;

export default function MobileHeader(): JSX.Element {
  const currentConnection = useCurrentConnection();
  const loading = useConnectionStore((state) => state.loading);
  const setConnectionsOpen = useMobileNavStore((state) => state.setConnectionsOpen);
  const updateUI = useSettingStore((state) => state.updateUI);
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);

  const alias = currentConnection ? getConnectionAlias(currentConnection.type) : undefined;
  const status: ConnectionStatus =
    loading === 'loading' ? 'loading' : loading === 'error' ? 'error' : currentConnection ? 'connected' : 'idle';

  const meta =
    status === 'loading'
      ? locales.connecting
      : status === 'error'
        ? locales.connection_error
        : (alias?.name ?? currentConnection?.type ?? locales.mobile_no_connection_meta);

  const menu: MenuType[] = [
    ...(currentConnection
      ? [{ name: locales.open_editor, icon: 'sql' as const, action: (): void => void addEditorTab() }]
      : []),
    ...(canCreateConnection(mode, user)
      ? [
          {
            name: locales.new_connection,
            icon: 'plus' as const,
            action: (): void => updateUI({ showAddConnection: true, duplicateConnectionId: undefined })
          }
        ]
      : []),
    { name: locales.settings, icon: 'settings', action: (): void => openSettings({ section: 0 }) },
    ...(canManageMcpSettings(mode, user)
      ? [
          {
            name: locales.mcp_settings,
            icon: 'network' as const,
            action: (): void => openSettings({ section: AI_SETTINGS_TAB, aiTab: 'mcp' })
          }
        ]
      : [])
  ];

  return (
    <MobileHeaderStyled>
      <ConnectionSwitcherStyled
        onClick={(): void => setConnectionsOpen(true)}
        aria-label={locales.connections}
        data-testid='mobile-connection-switcher'
      >
        <ConnectionIconStyled>
          <CustomIcon
            type={(alias?.logo ?? currentConnection?.icon ?? 'connection') as keyof typeof IconTypes}
            size='l'
          />
          <ConnectionStatusDotStyled status={status} />
        </ConnectionIconStyled>
        <ConnectionTextStyled>
          <ConnectionNameStyled>
            <span>{currentConnection?.name ?? locales.mobile_select_connection}</span>
            <CustomIcon type='chevronDown' size='s' />
          </ConnectionNameStyled>
          <ConnectionMetaStyled>{meta}</ConnectionMetaStyled>
        </ConnectionTextStyled>
      </ConnectionSwitcherStyled>
      {currentConnection && <SafeModeMenu />}
      <IconButton aria-label={locales.mobile_more_actions} onClick={(): void => setMenuOpen(true)}>
        <CustomIcon type='ellipsisVertical' size='m' />
      </IconButton>
      <ActionSheet open={menuOpen} onClose={(): void => setMenuOpen(false)} menu={menu} />
    </MobileHeaderStyled>
  );
}
