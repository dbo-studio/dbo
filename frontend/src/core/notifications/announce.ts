import type { NotificationType } from '@/api/notification/types';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { NotificationSettings } from '@/store/settingStore/types';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import api from '@/api';
import { notificationTitle } from './openNotification';
import { isWatched } from './watching';

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

const settingKey = (jobType: Exclude<NotificationType['jobType'], 'subscription'>): keyof NotificationSettings =>
  jobType === 'restore' || jobType === 'restore_drill' || jobType === 'tool_install' ? 'backup' : jobType;

/** How long after a desktop notification a window focus counts as the click on it. */
const CLICK_WINDOW_MS = 30_000;
let awaitingClick: { n: NotificationType; open: (n: NotificationType) => void; at: number } | undefined;
let listening = false;

function rememberForFocus(n: NotificationType, open: (n: NotificationType) => void): void {
  awaitingClick = { n, open, at: Date.now() };
  if (listening) return;

  listening = true;
  window.addEventListener('focus', () => {
    const pending = awaitingClick;
    awaitingClick = undefined;
    if (pending && Date.now() - pending.at < CLICK_WINDOW_MS) pending.open(pending.n);
  });
}

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
  if (!settings.enabled || (n.jobType !== 'subscription' && !settings[settingKey(n.jobType)])) return;

  // The user is looking at this job's progress; it already saw the outcome, so no second message.
  if (isWatched(n.jobId)) {
    void api.notification.markRead(n.id).catch(() => undefined);

    return;
  }

  const title = notificationTitle(n);
  const inFront = document.hasFocus();

  if (inFront && settings.onlyWhenUnfocused) {
    const show = n.kind === 'job_completed' ? toast.success : toast.error;
    show(title, { action: { label: locales.open, onClick: () => open(n) } });

    return;
  }

  if (!claim(n.id) || !(await permitted())) return;

  if (await tools.isTauri()) {
    // The desktop plugin has no click callback. A click brings the window forward, so coming forward soon after
    // the notification is taken as the click, and opens what it was about.
    await invoke('plugin:notification|notify', { options: { title, sound: settings.sound ? 'default' : undefined } })
      .then(() => rememberForFocus(n, open))
      .catch(() => undefined);

    return;
  }

  const notification = new Notification(title, { tag: `dbo-${n.id}`, silent: !settings.sound });
  notification.onclick = (): void => {
    window.focus();
    open(n);
    notification.close();
  };
}

const showSystem = async (title: string, body: string, sound: boolean): Promise<void> => {
  if (await tools.isTauri()) {
    await invoke('plugin:notification|notify', { options: { title, body, sound: sound ? 'default' : undefined } });

    return;
  }

  new Notification(title, { body, silent: !sound });
};

/**
 * Settings > Notifications "send a test": shows the in-app message and a system notification so the user
 * can see both work, whatever the toggles say. Reports what the system refused.
 */
export async function sendTestNotification(): Promise<void> {
  toast.success(locales.notification_test_title, { description: locales.notification_test_in_app });

  if (!(await requestNotificationPermission())) {
    toast.warning(locales.notification_test_denied);

    return;
  }

  try {
    await showSystem(
      locales.notification_test_title,
      locales.notification_test_system,
      useSettingStore.getState().general.notifications.sound
    );
  } catch {
    toast.error(locales.notification_test_failed);
  }
}
