import api from '@/api';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useJobEventsStore } from '@/store/jobEvents/jobEvents.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

const HINT_KEY = 'dbo-tray-hint-shown';

/**
 * Desktop only. The window can be hidden in the tray while this keeps running, so it tells the tray what to
 * show (running jobs, MCP state), passes on the "keep running" setting, and answers the tray's questions.
 */
export const useTraySync = (enabled: boolean): void => {
  const keepRunning = useSettingStore((state) => state.general.keepRunningInBackground);
  const running = useJobEventsStore(
    (state) => Object.values(state.jobs).filter((job) => job.status === 'running' || job.status === 'pending').length
  );
  const { data: mcp } = useQuery({
    queryKey: ['mcp-status'],
    queryFn: api.mcp.getStatus,
    enabled,
    refetchInterval: 30_000
  });

  const mcpLabel = !mcp?.enabled ? 'off' : mcp.healthy ? 'running' : 'unhealthy';

  useEffect(() => {
    if (!enabled) return;
    void tools.isTauri().then((desktop) => desktop && invoke('set_keep_running', { enabled: keepRunning }));
  }, [enabled, keepRunning]);

  useEffect(() => {
    if (!enabled) return;
    void tools
      .isTauri()
      .then((desktop) => desktop && invoke('update_tray_status', { runningJobs: running, mcp: mcpLabel }));
  }, [enabled, running, mcpLabel]);

  useEffect(() => {
    if (!enabled) return;

    const stops: Array<Promise<() => void>> = [];
    void tools.isTauri().then((desktop) => {
      if (!desktop) return;

      stops.push(
        listen('tray://hidden', () => {
          if (localStorage.getItem(HINT_KEY)) return;
          localStorage.setItem(HINT_KEY, '1');
          toast.info(locales.tray_hint);
        }),
        listen<number>('tray://confirm-quit', (event) => {
          useConfirmModalStore
            .getState()
            .danger(
              locales.tray_quit_title,
              locales.tray_quit_confirm.replace('{count}', String(event.payload)),
              () => void invoke('quit_app'),
              undefined,
              locales.tray_quit
            );
        })
      );
    });

    return () => stops.forEach((stop) => void stop.then((unlisten) => unlisten()));
  }, [enabled]);
};
