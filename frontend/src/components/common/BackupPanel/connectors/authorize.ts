import api from '@/api';
import type { ConnectorType } from '@/api/backup/types';
import { tools } from '@/core/utils/tools';
import { openUrl } from '@tauri-apps/plugin-opener';

/** Sends the user to the provider's page to approve access; the callback stores the token. */
export const authorizeConnector = async (item: ConnectorType): Promise<void> => {
  try {
    const url = await api.backup.oauthUrl(item.id);
    if (await tools.isTauri()) await openUrl(url);
    else window.open(url, '_blank');
  } catch {
    /* the api layer already toasted */
  }
};
