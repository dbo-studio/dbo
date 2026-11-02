import api from '@/api';
import type { NotificationType } from '@/api/notification/types';
import type { RunQueryResponseType } from '@/api/query/types';
import { storeQueryResult } from '@/core/events/backgroundQueries';
import locales from '@/locales';
import { useBackgroundQueryStore } from '@/store/backgroundQuery/backgroundQuery.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useJobResultModalStore } from '@/store/jobResultModal/jobResultModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ConnectionType } from '@/types';
import { toast } from 'sonner';

export const notificationTitle = (n: NotificationType): string =>
  locales[`notification_${n.kind}_${n.jobType}`] ?? n.title;

/** Opens what a notification points at: a query's rows in a new tab, or an import or export in the job modal. */
export async function openNotification(
  n: NotificationType,
  switchConnection: (connection: ConnectionType) => Promise<void>
): Promise<void> {
  if (n.jobId === null) return;

  // A failed query opens in an editor tab, ready to run again.
  if (n.jobType === 'query' && n.kind === 'job_failed') {
    try {
      const job = await api.job.detail(String(n.jobId));
      const request = job.data?.request;
      const connection = useConnectionStore.getState().connections?.find((item) => Number(item.id) === Number(request?.connectionId));
      if (job.data?.kind !== 'raw' || !connection || typeof request?.query !== 'string') throw new Error('not a query to rerun');

      await switchConnection(connection);
      const tab = useTabStore.getState().addEditorTab(request.query, { forceNew: true });
      useTabStore.getState().switchTab(tab.id);
      toast.info(locales.notification_query_reopened);
    } catch {
      useJobResultModalStore.getState().open(n.jobId, notificationTitle(n));
    }

    return;
  }

  if (n.jobType !== 'query' || n.kind !== 'job_completed') {
    useJobResultModalStore.getState().open(n.jobId, notificationTitle(n));

    return;
  }

  try {
    const job = await api.job.detail(String(n.jobId));
    const res = job.result?.data as RunQueryResponseType | undefined;
    const request = job.data?.request;
    if (!res || !request) throw new Error('expired');

    const connection = useConnectionStore.getState().connections?.find((item) => Number(item.id) === Number(request.connectionId));
    if (!connection) throw new Error('connection gone');
    await switchConnection(connection);

    const tabs = useTabStore.getState();
    const tab = tabs.addEditorTab(res.query || (typeof request.query === 'string' ? request.query : ''), { forceNew: true });
    // The rows go where a normal run leaves them, then the tab loads them as it would after one.
    await storeQueryResult(tab.id, 'raw', res);
    useBackgroundQueryStore.getState().deliver(tab.id);
    tabs.switchTab(tab.id);
  } catch {
    // The job's result is cleaned up after a while.
    toast.error(locales.notification_result_expired);
  }
}
