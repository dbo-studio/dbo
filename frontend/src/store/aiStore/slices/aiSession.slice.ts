import type { AiChatRequest } from '@/api/ai/types';
import type { StateCreator } from 'zustand';
import type { AiSession, AiSessionSlice, AiStreamingState } from '../types';

const initialStreamingState: AiStreamingState = {
  status: 'idle',
  phase: 'context',
  statusLabel: undefined,
  thinkingContent: '',
  thinkingStartedAt: undefined,
  thinkingDurationMs: undefined,
  previewContent: '',
  activeBlockType: undefined,
  error: undefined,
  lastRequest: undefined
};

/** What a chat shows before it has run a turn. Shared so selectors stay referentially stable. */
export const IDLE_SESSION: AiSession = { streaming: initialStreamingState, agentItems: [], unseen: false };

export const createAiSessionSlice: StateCreator<AiSessionSlice, [['zustand/devtools', never]], [], AiSessionSlice> = (
  set
) => {
  const patchSession = (chatId: number, patch: (session: AiSession) => Partial<AiSession>, action: string): void => {
    set(
      (state) => {
        const session = state.sessions[chatId] ?? IDLE_SESSION;
        return { sessions: { ...state.sessions, [chatId]: { ...session, ...patch(session) } } };
      },
      undefined,
      action
    );
  };

  return {
    sessions: {},
    resetStreaming: (chatId) => {
      patchSession(chatId, () => ({ streaming: initialStreamingState }), 'resetStreaming');
    },
    setStreamingStatus: (chatId, status) => {
      patchSession(chatId, (session) => ({ streaming: { ...session.streaming, status } }), 'setStreamingStatus');
    },
    updateStreaming: (chatId, partial) => {
      patchSession(chatId, (session) => ({ streaming: { ...session.streaming, ...partial } }), 'updateStreaming');
    },
    setLastRequest: (chatId, request: AiChatRequest | undefined) => {
      patchSession(
        chatId,
        (session) => ({ streaming: { ...session.streaming, lastRequest: request } }),
        'setLastRequest'
      );
    },
    markUnseen: (chatId, unseen) => {
      patchSession(chatId, () => ({ unseen }), 'markUnseen');
    },
    appendAgentItem: (chatId, item) => {
      patchSession(chatId, (session) => ({ agentItems: [...session.agentItems, item] }), 'appendAgentItem');
    },
    setPlan: (chatId, steps) => {
      patchSession(
        chatId,
        (session) => {
          const plan = { kind: 'plan' as const, steps };
          const shown = session.agentItems.some((item) => item.kind === 'plan');

          return {
            agentItems: shown
              ? session.agentItems.map((item) => (item.kind === 'plan' ? plan : item))
              : [...session.agentItems, plan]
          };
        },
        'setPlan'
      );
    },
    updateToolTrace: (chatId, id, partial) => {
      patchSession(
        chatId,
        (session) => ({
          agentItems: session.agentItems.map((item) =>
            item.kind === 'tool' && item.trace.id === id ? { ...item, trace: { ...item.trace, ...partial } } : item
          )
        }),
        'updateToolTrace'
      );
    },
    clearAgentItems: (chatId) => {
      patchSession(chatId, () => ({ agentItems: [] }), 'clearAgentItems');
    }
  };
};
