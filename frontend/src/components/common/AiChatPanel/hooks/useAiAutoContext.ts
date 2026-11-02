import { useCallback, useEffect, useRef } from 'react';
import { getEngineCapabilities, parseObjectNodeId } from '@/core/db';
import { TabMode } from '@/core/enums';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { getEditorSessionContext } from '@/hooks/useEditorSessionContext';
import { useAiStore } from '@/store/aiStore/ai.store';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import type { DataTabType } from '@/types/Tab';

const QUERY_DEBOUNCE_MS = 500;

export const useAiAutoContext = (active = true): void => {
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabs = useTabStore(selectTabs);
  const updateContext = useAiStore((state) => state.updateContext);
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
    if (!active) return;

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

    if (selectedTab.mode === TabMode.Data && useAiStore.getState().autoContext) {
      // A table opened from another database moves the context there.
      const capabilities = getEngineCapabilities(useConnectionStore.getState().currentConnection()?.type);
      const opened = parseObjectNodeId(selectedTab.nodeId);
      if (capabilities.hasDatabase && opened.database) nextContext.database = opened.database;
      if (capabilities.hasSchema && opened.schema) nextContext.schema = opened.schema;
    }

    // Tables and views belong to one database and schema; a different one starts them over.
    if (nextContext.database !== context.database || nextContext.schema !== context.schema) {
      nextContext.tables = [];
      nextContext.views = [];
    }

    if (selectedTab.mode === TabMode.Data) {
      const dataTab = selectedTab as DataTabType;
      if (dataTab.table && useAiStore.getState().autoContext) {
        if (!nextContext.tables.includes(dataTab.table)) {
          nextContext.tables = [...nextContext.tables, dataTab.table];
        }
      }
    }

    if (
      nextContext.database !== context.database ||
      nextContext.schema !== context.schema ||
      nextContext.tables.join() !== context.tables.join() ||
      nextContext.views.join() !== context.views.join()
    ) {
      updateContext(nextContext);
    }

    return () => {
      if (queryDebounceRef.current) {
        clearTimeout(queryDebounceRef.current);
      }
    };
  }, [active, selectedTabId, tabs, syncQuerySnippet, updateContext]);
};
