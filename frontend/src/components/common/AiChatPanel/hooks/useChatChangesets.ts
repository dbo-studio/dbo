import api from '@/api';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useChangesetStore } from '@/store/changesetStore/changeset.store';
import { useEffect } from 'react';

/** Loads the server-side changesets of the open chat, so its proposal cards show their review state after a reload. */
export const useChatChangesets = (active = true): void => {
  const chatId = useAiStore((state) => state.currentChat?.id);

  useEffect(() => {
    if (!active || !chatId) return;

    void api.aiChat
      .getChangesets(chatId)
      .then(useChangesetStore.getState().upsert)
      .catch(() => undefined);
  }, [active, chatId]);
};
