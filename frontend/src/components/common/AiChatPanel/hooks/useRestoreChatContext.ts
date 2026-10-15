import { useEffect } from 'react';
import { useAiStore } from '@/store/aiStore/ai.store';

/** Reopening a chat from history brings back the database / schema / table chips it was using. */
export const useRestoreChatContext = (): void => {
  const chatId = useAiStore((state) => state.currentChat?.id);

  useEffect(() => {
    const { currentChat, context, updateContext } = useAiStore.getState();
    const saved = currentChat?.context;
    if (!saved) return;

    updateContext({
      ...context,
      database: saved.database ?? undefined,
      schema: saved.schema ?? undefined,
      tables: saved.tables ?? [],
      views: saved.views ?? []
    });
  }, [chatId]);
};
