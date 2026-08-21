import { useCallback, useEffect, useRef } from 'react';
import { TabMode } from '@/core/enums';
import { getEditorSessionContext } from '@/hooks/useEditorSessionContext';
import { useAiStore } from '@/store/aiStore/ai.store';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType } from '@/types/Tab';

const QUERY_DEBOUNCE_MS = 500;

export const useAiAutoContext = (): void => {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabs = useTabStore(selectTabs);
  const updateContext = useAiStore((state) => state.updateContext);
  const manualOverrideRef = useRef(false);
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncQuerySnippet = useCallback(
    (query: string) => {
      const context = useAiStore.getState().context;
      if (context.querySnippet === query) return;
      updateContext({ ...context, querySnippet: query });
    },
    [updateContext]
  );

  useEffect(() => {
    const selectedTab = useTabStore.getState().selectedTab();
    const context = useAiStore.getState().context;

    if (!selectedTab) return;

    const nextContext = { ...context };

    if (selectedTab.mode === TabMode.Query) {
      const session = getEditorSessionContext();
      nextContext.database = session.database || context.database;
      nextContext.schema = session.schema || context.schema;

      const query = useTabStore.getState().getQuery(selectedTab.id);
      if (queryDebounceRef.current) {
        clearTimeout(queryDebounceRef.current);
      }
      queryDebounceRef.current = setTimeout(() => syncQuerySnippet(query), QUERY_DEBOUNCE_MS);
    }

    if (selectedTab.mode === TabMode.Data) {
      const dataTab = selectedTab as DataTabType;
      if (dataTab.table && !manualOverrideRef.current) {
        const hasTable = context.tables.includes(dataTab.table);
        if (!hasTable) {
          nextContext.tables = [...context.tables, dataTab.table];
        }
      }
    }

    if (
      nextContext.database !== context.database ||
      nextContext.schema !== context.schema ||
      nextContext.tables.join() !== context.tables.join()
    ) {
      updateContext(nextContext);
    }

    return () => {
      if (queryDebounceRef.current) {
        clearTimeout(queryDebounceRef.current);
      }
    };
  }, [selectedTabId, tabs, syncQuerySnippet, updateContext]);

  useEffect(() => {
    const unsubscribe = useAiStore.subscribe((state, prev) => {
      if (
        state.context.tables !== prev.context.tables ||
        state.context.database !== prev.context.database ||
        state.context.schema !== prev.context.schema
      ) {
        manualOverrideRef.current = true;
      }
    });
    return unsubscribe;
  }, []);
};
