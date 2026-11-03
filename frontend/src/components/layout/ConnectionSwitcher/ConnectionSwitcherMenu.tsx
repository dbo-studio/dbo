import Search from '@/components/base/Search/Search';
import { canCreateConnection } from '@/core/auth/permissions';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useSwitchConnection } from '@/hooks/useSwitchConnection';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button, Popover, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { type JSX, useMemo, useState } from 'react';
import { useConnectionLock } from '@/components/common/Connections/useUnlockConnection';
import SortableList from '@/components/base/SortableList/SortableList';
import ConnectionRow from './ConnectionRow';
import {
  SwitcherFooterStyled,
  SwitcherListStyled,
  SwitcherPanelStyled,
  SwitcherSearchStyled
} from './ConnectionSwitcher.styled';

/** The list of connections as a popover. Shared by the sidebar switcher and the header crumb. */
export default function ConnectionSwitcherMenu({
  anchor,
  onClose
}: {
  anchor: HTMLElement | null;
  onClose: () => void;
}): JSX.Element {
  const connections = useConnectionStore((s) => s.connections) ?? [];
  const current = useCurrentConnection();
  const { locked } = useConnectionLock();
  const { switchConnection, isSwitching, switchingId } = useSwitchConnection();
  const updateUI = useSettingStore((s) => s.updateUI);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAdd = canCreateConnection(mode, user);
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? connections.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
      : connections;
  }, [connections, query]);

  const queryClient = useQueryClient();
  const reorder = (activeId: string, overId: string): void => {
    useConnectionStore.getState().reorderConnections(activeId, overId);
    const ordered = useConnectionStore.getState().connections;
    if (ordered) queryClient.setQueryData(['connections'], ordered);
  };

  const close = (): void => {
    setQuery('');
    onClose();
  };

  return (
    <Popover
      open={!!anchor}
      anchorEl={anchor}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: { backgroundImage: 'none' } } }}
    >
      <SwitcherPanelStyled data-testid='connection-switcher-panel'>
        {connections.length > 6 && (
          <SwitcherSearchStyled>
            <Search value={query} onChange={setQuery} placeholder={locales.connection_switcher_search} />
          </SwitcherSearchStyled>
        )}
        <SwitcherListStyled role='listbox'>
          {shown.length === 0 && (
            <Typography variant='body2' color='textSubdued' sx={{ p: 1.5 }}>
              {connections.length === 0 ? locales.connection_switcher_no_connections : locales.connection_switcher_empty}
            </Typography>
          )}
          <SortableList
            items={shown}
            // Reordering a filtered list would be ambiguous, so it only works on the full list.
            onReorder={query ? () => undefined : reorder}
            getItemId={(c) => String(c.id)}
            direction='vertical'
            activationDistance={8}
            renderItem={(c, _index, meta) => (
              <ConnectionRow
                connection={c}
                selected={c.id === current?.id}
                loading={isSwitching && switchingId === c.id}
                overlay={meta.overlay}
                locked={locked && c.id === current?.id}
                onMenuClosed={close}
                onPick={() => {
                  close();
                  void switchConnection(c);
                }}
              />
            )}
          />
        </SwitcherListStyled>
        {canAdd && (
          <SwitcherFooterStyled>
            <Button
              fullWidth
              size='small'
              onClick={() => {
                close();
                updateUI({ showAddConnection: true, duplicateConnectionId: undefined });
              }}
              data-testid='add-connection-switcher'
            >
              {locales.new_connection}
            </Button>
          </SwitcherFooterStyled>
        )}
      </SwitcherPanelStyled>
    </Popover>
  );
}
