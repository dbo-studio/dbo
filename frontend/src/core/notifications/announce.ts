import type { NotificationType } from '@/api/notification/types';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { notificationTitle } from './openNotification';

// Several tabs of one browser each get the event; one of them speaks.
const claims = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('dbo-notifications');
const claimed = new Set<number>();
claims?.addEventListener('message', (message: MessageEvent<number>) => claimed.add(message.data));

/** True for the first tab to ask about this notification. */
const claim = (id: number): boolean => {
  if (claimed.has(id)) return false;
  claimed.add(id);
  claims?.postMessage(id);

  return true;
};

/** The system's notification permission, asked for on a click, never on load. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (await tools.isTauri()) {
    if (await invoke<boolean>('plugin:notification|is_permission_granted')) return true;

    return (await invoke<string>('plugin:notification|request_permission')) === 'granted';
  }

  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;

  return (await Notification.requestPermission()) === 'granted';
}

const permitted = async (): Promise<boolean> =>
  (await tools.isTauri())
    ? invoke<boolean>('plugin:notification|is_permission_granted').catch(() => false)
    : typeof Notification !== 'undefined' && Notification.permission === 'granted';

/**
 * Tells the user a job ended, the way their settings say. In front of the app a toast does it; behind it the
 * system does (OS notification on desktop, browser notification on the web). Only a title goes out: results
 * and credentials never leave the app in a notification.
 */
export async function announce(n: NotificationType, open: (n: NotificationType) => void): Promise<void> {
  const settings = useSettingStore.getState().general.notifications;
  if (!settings.enabled || !settings[n.jobType]) return;

  const title = notificationTitle(n);
  const inFront = document.hasFocus();

  if (inFront && settings.onlyWhenUnfocused) {
    const show = n.kind === 'job_failed' ? toast.error : toast.success;
    show(title, { action: { label: locales.open, onClick: () => open(n) } });

    return;
  }

  if (!claim(n.id) || !(await permitted())) return;

  if (await tools.isTauri()) {
    // Desktop notifications cannot call back into the app: a click only brings it forward, and the bell has the entry.
    await invoke('plugin:notification|notify', { options: { title, sound: settings.sound ? 'default' : undefined } }).catch(
      () => undefined
    );

    return;
  }

  const notification = new Notification(title, { tag: `dbo-${n.id}`, silent: !settings.sound });
  notification.onclick = (): void => {
    window.focus();
    open(n);
    notification.close();
  };
}
