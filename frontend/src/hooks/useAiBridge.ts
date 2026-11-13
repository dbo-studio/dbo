import { isMongoDriver, isRedisDriver } from '@/core/db/connectionAliases';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { AiContextType, AiSelectionAction } from '@/types';
import { useCallback } from 'react';

/** What the user is looking at, so the prompt does not call a MongoDB statement a SQL query. */
function subjectFor(type: string | undefined): string {
  if (isMongoDriver(type)) return 'MongoDB statement';
  if (isRedisDriver(type)) return 'Redis command';
  return 'SQL query';
}

const actionPrompt = (action: AiSelectionAction, subject: string): string =>
  ({
    explain: `Explain this ${subject} in detail.`,
    optimize: `Suggest optimizations for this ${subject}.`,
    fix: `Fix the errors in this ${subject}.`
  })[action];

export function useAiBridge() {
  const setBridgeRequest = useAiStore((s) => s.setBridgeRequest);
  const updateContext = useAiStore((s) => s.updateContext);
  const updateUI = useSettingStore((s) => s.updateUI);
  const subject = subjectFor(useCurrentConnection()?.type);

  const openAssistant = useCallback(
    (tab = 0) => {
      const sidebar = useSettingStore.getState().ui.sidebar;
      updateUI({ sidebar: { ...sidebar, showRight: true, rightSidebarTab: tab } });
    },
    [updateUI]
  );

  const prefillChat = useCallback(
    (message: string, autoSend = false, contextPatch?: Partial<AiContextType>) => {
      openAssistant(0);
      const nextContext = { ...useAiStore.getState().context, ...contextPatch };
      if (contextPatch) {
        updateContext(nextContext);
      }
      setBridgeRequest({ message, autoSend, contextPatch });
    },
    [openAssistant, setBridgeRequest, updateContext]
  );

  const askAboutSelection = useCallback(
    (sql: string, action: AiSelectionAction, contextPatch?: Partial<AiContextType>) => {
      const message = actionPrompt(action, subject);
      prefillChat(message, true, {
        ...contextPatch,
        selectedQuery: sql,
        input: message
      });
    },
    [prefillChat, subject]
  );

  const askAboutError = useCallback(
    (query?: string) => {
      const message = `Help me fix this ${subject} error.`;
      prefillChat(message, true, {
        selectedQuery: query,
        input: message
      });
    },
    [prefillChat, subject]
  );

  return { openAssistant, prefillChat, askAboutSelection, askAboutError };
}
