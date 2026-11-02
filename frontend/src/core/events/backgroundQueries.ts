import api from '@/api';
import type { GridMetaType, RunQueryResponseType } from '@/api/query/types';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import locales from '@/locales';
import { useBackgroundQueryStore } from '@/store/backgroundQuery/backgroundQuery.store';
import type { JobEvent } from '@/store/jobEvents/jobEvents.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType } from '@/types';
import { toast } from 'sonner';

/** Puts a finished query's rows where its tab loads them from, the way a normal run leaves them. */
export async function storeQueryResult(tabId: string, kind: 'run' | 'raw', res: RunQueryResponseType): Promise<void> {
  const tab = useTabStore.getState().getTabs().find((item) => item.id === tabId) as DataTabType | undefined;
  const gridMeta: GridMetaType =
    kind === 'raw'
      ? { gridEditable: !!res.editable, updatableNodeId: res.nodeId, editableReason: res.editableReason, drivingTable: res.drivingTable }
      : { gridEditable: !!tab?.editable, updatableNodeId: tab?.nodeId };

  await Promise.all([indexedDBService.saveRows(tabId, res.data), indexedDBService.saveColumns(tabId, res.columns, gridMeta)]);
  if (res.query) useTabStore.getState().updateQuery(res.query, tabId);
}

/**
 * Looks at a job's saved state and settles its tab if it already ended. The end can come before the answer that
 * made the tab wait, and after a break in the live stream; the database has it either way.
 */
export async function reconcileBackgroundQuery(jobId: number): Promise<void> {
  try {
    const job = await api.job.detail(String(jobId));
    await settleBackgroundQuery({ id: job.id, type: job.type, status: job.status, progress: job.progress, message: job.message, error: job.error });
  } catch {
    // Not found or unreachable: the next event or reconnect looks again.
  }
}

/** A job ended: if a tab was waiting on it, hand the tab its rows or say why there are none. */
export async function settleBackgroundQuery(event: JobEvent): Promise<void> {
  if (event.status === 'pending' || event.status === 'running') return;

  const store = useBackgroundQueryStore.getState();
  const waiting = Object.entries(store.byTab).find(([, query]) => query.jobId === event.id);
  if (!waiting) return;

  const [tabId, query] = waiting;
  store.clear(tabId);

  if (event.status === 'failed') {
    toast.error(event.error || locales.query_failed);

    return;
  }

  if (event.status !== 'completed') return;

  try {
    const job = await api.job.detail(String(event.id));
    const res = job.result?.data as RunQueryResponseType | undefined;
    if (!res) return;

    await storeQueryResult(tabId, query.kind, res);
    useBackgroundQueryStore.getState().deliver(tabId);
  } catch {
    toast.error(locales.query_failed);
  }
}
