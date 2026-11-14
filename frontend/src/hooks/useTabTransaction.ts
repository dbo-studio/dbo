import api from '@/api';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTransactionStore } from '@/store/transactionStore/transaction.store';
import { getEditorSessionContext } from '@/hooks/useEditorSessionContext';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useCallback } from 'react';
import { toast } from 'sonner';

type UseTabTransactionReturn = {
  active: boolean;
  begin: () => Promise<void>;
  end: (commit: boolean) => Promise<void>;
};

/** The open transaction of the selected editor tab: begin it, then commit or roll it back. */
export const useTabTransaction = (): UseTabTransactionReturn => {
  const tabId = useSelectedTab()?.id;
  const connectionId = useConnectionStore((state) => state.currentConnectionId);
  const active = useTransactionStore((state) => (tabId ? tabId in state.byTab : false));

  const begin = useCallback(async (): Promise<void> => {
    if (!tabId || !connectionId) return;
    try {
      await api.query.beginTransaction({
        connectionId: Number(connectionId),
        tab: tabId,
        database: getEditorSessionContext().database
      });
      useTransactionStore.getState().set(tabId, Number(connectionId));
    } catch {
      toast.error(locales.transaction_failed);
    }
  }, [tabId, connectionId]);

  const end = useCallback(
    async (commit: boolean): Promise<void> => {
      if (!tabId || !connectionId) return;
      try {
        await api.query.endTransaction({ connectionId: Number(connectionId), tab: tabId }, commit);
        toast.success(commit ? locales.transaction_committed : locales.transaction_rolled_back);
      } catch {
        toast.error(locales.transaction_failed);
      } finally {
        // Committed, rolled back, or already gone on the server: the tab has no transaction either way.
        useTransactionStore.getState().clear(tabId);
      }
    },
    [tabId, connectionId]
  );

  return { active, begin, end };
};
