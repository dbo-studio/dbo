import { connectionDatabase, resolveEditorContext } from '@/core/db';
import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks/useCurrentConnection.hook';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { siblingObjectNodeIds } from '@/store/tabStore/siblingObjectNodeIds';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import type { EditorTabType } from '@/types/Tab';
import { useEffect } from 'react';

type Catalog = {
  databases: string[];
  schemas: string[];
};

/**
 * Keeps the selected editor tab's database/schema in sync when unlocked.
 * Locked tabs still drop stale catalog values but keep contextLocked.
 * Runs on tab/connection change and when autocomplete catalog arrives.
 */
export const useSyncEditorContext = (catalog?: Catalog): void => {
  const selectedTab = useSelectedTab<EditorTabType>();
  const currentConnection = useCurrentConnection();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const focusedNodeId = useTreeStore((state) =>
    currentConnection?.id ? state.focusedNodeId[currentConnection.id] : undefined
  );
  const lastUsed = useSettingStore((state) =>
    currentConnection?.id ? state.editorContextByConnection[String(currentConnection.id)] : undefined
  );

  const tabId = selectedTab?.id;
  const tabMode = selectedTab?.mode;
  const tabDatabase = selectedTab?.database ?? '';
  const tabSchema = selectedTab?.schema ?? '';
  const tabLocked = selectedTab?.contextLocked ?? false;
  const tabSource = selectedTab?.contextSource ?? 'none';
  const connectionId = currentConnection?.id;
  const connectionType = currentConnection?.type;
  const catalogDatabasesKey = catalog?.databases.join('\0') ?? '';
  const catalogSchemasKey = catalog?.schemas.join('\0') ?? '';

  useEffect(() => {
    if (!selectedTab || tabMode !== TabMode.Query || !currentConnection || connectionId === undefined) {
      return;
    }

    const siblingNodeIds = siblingObjectNodeIds(selectTabs(useTabStore.getState()), connectionId);

    const resolved = resolveEditorContext({
      engine: connectionType,
      current: {
        database: tabDatabase,
        schema: tabSchema,
        contextLocked: tabLocked,
        contextSource: tabSource
      },
      connectionDatabase: connectionDatabase(currentConnection),
      focusedNodeId,
      siblingNodeIds,
      lastUsed,
      catalog: catalog
        ? {
            databases: catalog.databases,
            schemas: catalog.schemas
          }
        : undefined
    });

    const nextSource = tabLocked ? (selectedTab.contextSource ?? 'manual') : resolved.source;

    if (
      resolved.database === tabDatabase &&
      resolved.schema === tabSchema &&
      nextSource === tabSource &&
      (selectedTab.contextLocked ?? false) === tabLocked
    ) {
      return;
    }

    updateSelectedTab({
      ...selectedTab,
      database: resolved.database,
      schema: resolved.schema,
      contextSource: nextSource,
      contextLocked: tabLocked
    });
  }, [
    selectedTab,
    tabId,
    tabMode,
    tabDatabase,
    tabSchema,
    tabLocked,
    tabSource,
    currentConnection,
    connectionId,
    connectionType,
    focusedNodeId,
    lastUsed,
    catalog,
    catalogDatabasesKey,
    catalogSchemasKey,
    updateSelectedTab
  ]);
};
