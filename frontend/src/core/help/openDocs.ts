import { constants } from '@/core/constants';
import { openExternal } from './openExternal';

/** Open the documentation in the system browser on desktop, a new tab on web. */
export async function openDocs(): Promise<void> {
  await openExternal(constants.docsUrl);
}
