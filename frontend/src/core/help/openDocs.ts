import { constants } from '@/core/constants';
import { tools } from '@/core/utils';
import { openUrl } from '@tauri-apps/plugin-opener';

/** Open the documentation in the system browser on desktop, a new tab on web. */
export async function openDocs(): Promise<void> {
  if (await tools.isTauri()) {
    await openUrl(constants.docsUrl).catch(() => undefined);
    return;
  }
  window.open(constants.docsUrl, '_blank', 'noopener,noreferrer');
}
