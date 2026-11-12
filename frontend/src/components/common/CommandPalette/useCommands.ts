import api from '@/api';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import { openBottomPanel } from '@/core/bottomPanel';
import { openBackup } from '@/core/backup/openBackup';
import { openDocs } from '@/core/help/openDocs';
import { openSettings } from '@/core/settings/openSettings';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useSwitchConnection } from '@/hooks/useSwitchConnection';
import locales from '@/locales';
import { useAccountStore } from '@/store/accountStore/account.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useMemo } from 'react';

export type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: keyof typeof IconTypes;
  run: () => void;
};

const toggleSidebar = (side: 'showLeft' | 'showRight'): void => {
  const { sidebar } = useSettingStore.getState().ui;
  useSettingStore.getState().updateUI({ sidebar: { ...sidebar, [side]: !sidebar[side] } });
};

/** Everything the palette can run, filtered by the query. Objects come from the server's tree search. */
export function useCommands(query: string): Command[] {
  const connection = useCurrentConnection();
  const connections = useConnectionStore((s) => s.connections) ?? [];
  const { switchConnection } = useSwitchConnection();
  const { data: schedules = [] } = useQuery({ queryKey: ['backup-schedules'], queryFn: api.backup.schedules });
  const q = useDeferredValue(query.trim());

  const { data: objects } = useQuery({
    queryKey: ['command-objects', connection?.id, q],
    queryFn: () => api.tree.searchTree({ connectionId: connection?.id as number, query: q, limit: 8 }),
    enabled: !!connection && q.length >= 2,
    staleTime: 15_000
  });

  return useMemo(() => {
    const actions: Command[] = [
      {
        id: 'editor',
        group: locales.command_group_actions,
        label: locales.command_new_editor,
        icon: 'sql',
        run: () => void useTabStore.getState().addEditorTab()
      },
      {
        id: 'settings',
        group: locales.command_group_actions,
        label: locales.command_open_settings,
        icon: 'settings',
        run: () => openSettings()
      },
      {
        id: 'new-connection',
        group: locales.command_group_actions,
        label: locales.command_new_connection,
        icon: 'plus',
        run: () => useSettingStore.getState().updateUI({ showAddConnection: true, duplicateConnectionId: undefined })
      },
      {
        id: 'bottom-panel',
        group: locales.command_group_actions,
        label: locales.toggle_bottom_panel,
        icon: 'sql',
        run: () => openBottomPanel()
      },
      {
        id: 'left',
        group: locales.command_group_actions,
        label: locales.command_toggle_left,
        icon: 'sideLeft',
        run: () => toggleSidebar('showLeft')
      },
      {
        id: 'right',
        group: locales.command_group_actions,
        label: locales.command_toggle_right,
        icon: 'sideRight',
        run: () => toggleSidebar('showRight')
      },
      {
        id: 'docs',
        group: locales.command_group_help,
        label: locales.command_documentation,
        icon: 'externalLink',
        run: () => void openDocs()
      },
      {
        id: 'shortcuts',
        group: locales.command_group_help,
        label: locales.keyboard_shortcuts,
        icon: 'settings',
        run: () => openSettings({ section: 2 })
      },
      {
        id: 'welcome',
        group: locales.command_group_help,
        label: locales.command_show_welcome,
        icon: 'about',
        run: () => useAccountStore.getState().showOnboarding()
      },
      {
        id: 'backup',
        group: locales.command_group_backup,
        label: locales.command_open_backup,
        icon: 'backup',
        run: () => openBackup()
      },
      {
        id: 'new-schedule',
        group: locales.command_group_backup,
        label: locales.command_new_schedule,
        icon: 'plus',
        run: () => openBackup({ section: 'schedules', scheduleId: 'new' })
      },
      {
        id: 'restore',
        group: locales.command_group_backup,
        label: locales.command_restore,
        icon: 'undo',
        run: () => openBackup({ section: 'restore' })
      },
      {
        id: 'tools',
        group: locales.command_group_backup,
        label: locales.command_backup_tools,
        icon: 'wrench',
        run: () => openBackup({ section: 'tools' })
      }
    ];

    const schedulesCommands: Command[] = schedules.map((s) => ({
      id: `schedule-${s.id}`,
      group: locales.command_group_backup,
      label: s.name,
      hint: locales.backup_jobs,
      icon: 'clock',
      run: () => openBackup({ section: 'schedules', scheduleId: s.id })
    }));

    const connectionCommands: Command[] = connections
      .filter((c) => c.id !== connection?.id)
      .map((c) => ({
        id: `connection-${c.id}`,
        group: locales.command_group_connections,
        label: locales.command_switch_to.replace('{name}', c.name),
        hint: c.type,
        icon: 'connection',
        run: () => void switchConnection(c)
      }));

    const objectCommands: Command[] = (objects?.results ?? []).map((r) => ({
      id: `object-${r.node.id}`,
      group: locales.command_group_objects,
      label: r.node.name,
      hint: r.path.map((p) => p.name).join(' › '),
      icon: 'sheet',
      run: () => {
        if (r.node.type === 'table' || r.node.type === 'view')
          useTabStore.getState().addDataTab(r.node.name, r.node.id, r.node.type === 'table');
      }
    }));

    const needle = q.toLowerCase();
    const match = (c: Command): boolean => !needle || `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(needle);
    const staticMatches = [...actions, ...schedulesCommands, ...connectionCommands].filter(match);

    return [...objectCommands, ...staticMatches].filter((c) => c.id !== 'editor' || !!connection);
  }, [q, schedules, connections, connection, objects, switchConnection]);
}
