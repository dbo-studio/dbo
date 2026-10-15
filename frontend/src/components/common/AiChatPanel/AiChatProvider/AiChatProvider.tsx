import { useAiStore } from '@/store/aiStore/ai.store';
import { type JSX, type ReactNode, useEffect } from 'react';
import { useAiAutoContext } from '../hooks/useAiAutoContext';
import { useAiChat } from '../hooks/useAiChat';
import { AiChatControllerContext } from '../hooks/useAiChatController';
import { useRestoreChatContext } from '../hooks/useRestoreChatContext';

type AiChatProviderProps = {
  /** True while an AI surface is visible; context sync and editor hand-offs only run then. */
  active: boolean;
  children: ReactNode;
};

/**
 * Owns the single chat controller (stream, abort handle, editor hand-offs) for
 * every AI surface, so a running turn survives closing the panel or moving
 * between the panel and the agent workspace.
 */
export default function AiChatProvider({ active, children }: AiChatProviderProps): JSX.Element {
  const controller = useAiChat(active);
  useAiAutoContext(active);
  useRestoreChatContext(active);

  const bridgeRequest = useAiStore((state) => state.bridgeRequest);
  const setBridgeRequest = useAiStore((state) => state.setBridgeRequest);
  const updateContext = useAiStore((state) => state.updateContext);
  const { handleSend } = controller;

  useEffect(() => {
    if (!active || !bridgeRequest) return;

    const { message, autoSend, contextPatch } = bridgeRequest;
    setBridgeRequest(null);

    if (contextPatch) {
      updateContext({ ...useAiStore.getState().context, ...contextPatch });
    }
    if (message) {
      const nextContext = { ...useAiStore.getState().context, input: message };
      updateContext(nextContext);
      if (autoSend) {
        void handleSend(message);
      }
    }
  }, [active, bridgeRequest, handleSend, setBridgeRequest, updateContext]);

  return <AiChatControllerContext value={controller}>{children}</AiChatControllerContext>;
}
