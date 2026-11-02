import { tools } from '@/core/utils';
import { openUrl } from '@tauri-apps/plugin-opener';

/** Opens a page in the system browser: the desktop app cannot show an OAuth page itself. */
export const openExternal = async (url: string): Promise<void> => {
  if (await tools.isTauri()) {
    await openUrl(url);
    return;
  }

  window.open(url, '_blank', 'noopener');
};
