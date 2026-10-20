import type {
  AiAgentItem,
  AiBridgeRequest,
  AiChatType,
  AiContextType,
  AiMessageType,
  AiPlanStep,
  AiProviderType,
  AiToolTrace
} from '@/types';
import type { AiChatRequest } from '@/api/ai/types';

export type AiStreamingPhase = 'context' | 'thinking' | 'answering';

export type AiStreamingState = {
  status: 'idle' | 'streaming';
  phase: AiStreamingPhase;
  statusLabel?: string;
  thinkingContent: string;
  thinkingStartedAt?: number;
  thinkingDurationMs?: number;
  previewContent: string;
  activeBlockType?: 'explanation' | 'code';
  error?: string;
  lastRequest?: AiChatRequest;
};

/** One chat's running or last turn. Chats stream independently of each other. */
export type AiSession = {
  streaming: AiStreamingState;
  /** Live tool/diagram/plan cards of the turn being streamed. */
  agentItems: AiAgentItem[];
  /** A turn finished while the user was in another chat. */
  unseen: boolean;
};

export type AiSessionSlice = {
  sessions: Record<number, AiSession>;
  resetStreaming: (chatId: number) => void;
  setStreamingStatus: (chatId: number, status: AiStreamingState['status']) => void;
  updateStreaming: (chatId: number, partial: Partial<AiStreamingState>) => void;
  setLastRequest: (chatId: number, request: AiChatRequest | undefined) => void;
  markUnseen: (chatId: number, unseen: boolean) => void;
  appendAgentItem: (chatId: number, item: AiAgentItem) => void;
  /** Shows the agent's latest checklist, replacing the one already shown for the turn. */
  setPlan: (chatId: number, steps: AiPlanStep[]) => void;
  updateToolTrace: (chatId: number, id: string, partial: Partial<AiToolTrace>) => void;
  clearAgentItems: (chatId: number) => void;
};

export type AIThread = {
  id: number;
  title: string;
  createdAt: number;
  messages: AiMessageType[];
};

export type AiProviderSlice = {
  providers: AiProviderType[] | undefined;
  updateProviders: (providers: AiProviderType[]) => void;
  updateProvider: (provider: AiProviderType) => void;
};

export type AiChatSlice = {
  chats: AiChatType[];
  currentChat: AiChatType | undefined;
  updateCurrentChat: (chat: AiChatType | undefined) => void;
  /** Updates a chat in the list, and the open chat only if it is that one. */
  patchChat: (chat: AiChatType) => void;
  updateChats: (chats: AiChatType[]) => void;
  addChat: (chat: AiChatType) => void;
  addMessage: (chat: AiChatType, messages: AiMessageType[]) => AiChatType;
};

export type AiContextSlice = {
  context: AiContextType;
  messageEdit: boolean;
  /** When true the context chips follow the active explorer/editor tab; false = pinned. */
  autoContext: boolean;
  setAutoContext: (value: boolean) => void;
  toggleMessageEdit: () => void;
  updateContext: (context: AiContextType) => void;
};

export type AiBridgeSlice = {
  bridgeRequest: AiBridgeRequest | null;
  setBridgeRequest: (request: AiBridgeRequest | null) => void;
};
