import { tools } from '@/core/utils';
import { openUrl } from '@tauri-apps/plugin-opener';

/** Opens http(s) in the system browser on desktop, and a new tab on the web. */
export async function openExternal(url: string): Promise<void> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }
  if (await tools.isTauri()) {
    await openUrl(url).catch(() => undefined);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
