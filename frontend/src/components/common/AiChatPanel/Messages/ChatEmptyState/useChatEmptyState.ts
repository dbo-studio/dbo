import { isMongoDriver, isRedisDriver } from '@/core/db/connectionAliases';
import { getAiStatus } from '@/core/ai/aiStatus';
import { TabMode } from '@/core/enums';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import { useMemo } from 'react';
import { getChatPromptSuggestions, type ChatPromptKey } from '../../utils/chatPromptSuggestions';

export function useChatEmptyState(): { ready: boolean; hasConnection: boolean; promptKeys: ChatPromptKey[] } {
  const providers = useAiStore((state) => state.providers);
  const context = useAiStore((state) => state.context);
  const hasConnection = useConnectionStore((state) => Boolean(state.currentConnection()));
  const connectionType = useConnectionStore((state) => state.currentConnection()?.type);
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const tabs = useTabStore(selectTabs);
  const getQuery = useTabStore((state) => state.getQuery);

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);
  const editorQuery = selectedTab?.mode === TabMode.Query ? (getQuery(selectedTab.id) || '').trim() : '';
  const engine = isMongoDriver(connectionType) ? 'mongo' : isRedisDriver(connectionType) ? 'redis' : 'sql';
  const promptKeys = useMemo(
    () => getChatPromptSuggestions(context, editorQuery, engine),
    [context, editorQuery, engine]
  );

  return { ready: getAiStatus(providers).ready, hasConnection, promptKeys };
}
