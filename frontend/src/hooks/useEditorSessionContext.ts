import { getEngineCapabilities, type EngineCapabilities } from '@/core/db';
import { TabMode } from '@/core/enums';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { EditorTabType } from '@/types/Tab';

export type EditorSessionContext = {
  database?: string;
  schema?: string;
  capabilities: EngineCapabilities;
};

/** Non-hook getter for store slices and non-React callers. */
export const getEditorSessionContext = (): EditorSessionContext => {
  const connection = useConnectionStore.getState().currentConnection();
  const capabilities = getEngineCapabilities(connection?.type);
  const selectedTab = useTabStore.getState().selectedTab();

  if (!selectedTab || selectedTab.mode !== TabMode.Query) {
    return { capabilities };
  }

  const editorTab = selectedTab as EditorTabType;
  return {
    database: capabilities.hasDatabase && editorTab.database ? editorTab.database : undefined,
    schema: capabilities.hasSchema && editorTab.schema ? editorTab.schema : undefined,
    capabilities
  };
};

export const useEditorSessionContext = (): EditorSessionContext => {
  const connectionType = useConnectionStore((state) => state.currentConnection()?.type);
  const selectedTab = useTabStore((state) => state.selectedTab());
  const capabilities = getEngineCapabilities(connectionType);

  if (!selectedTab || selectedTab.mode !== TabMode.Query) {
    return { capabilities };
  }

  const editorTab = selectedTab as EditorTabType;
  return {
    database: capabilities.hasDatabase && editorTab.database ? editorTab.database : undefined,
    schema: capabilities.hasSchema && editorTab.schema ? editorTab.schema : undefined,
    capabilities
  };
};
