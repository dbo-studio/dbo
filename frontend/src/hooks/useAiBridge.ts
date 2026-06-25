import { useCallback } from 'react';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { AiContextType, AiSelectionAction } from '@/types';

const ACTION_PROMPTS: Record<AiSelectionAction, string> = {
  explain: 'Explain this SQL query in detail.',
  optimize: 'Suggest optimizations for this SQL query.',
  fix: 'Fix the errors in this SQL query.'
};

export function useAiBridge() {
  const setBridgeRequest = useAiStore((s) => s.setBridgeRequest);
  const updateContext = useAiStore((s) => s.updateContext);
  const updateUI = useSettingStore((s) => s.updateUI);

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
      const message = ACTION_PROMPTS[action];
      prefillChat(message, true, {
        ...contextPatch,
        selectedQuery: sql,
        input: message
      });
    },
    [prefillChat]
  );

  const askAboutError = useCallback(
    (error: string, query?: string) => {
      const message = 'Help me fix this query error.';
      prefillChat(message, true, {
        queryError: error,
        selectedQuery: query,
        input: message
      });
    },
    [prefillChat]
  );

  return { openAssistant, prefillChat, askAboutSelection, askAboutError };
}
