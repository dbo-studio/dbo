import type {
  AiAgentItem,
  AiBridgeRequest,
  AiChatType,
  AiContextType,
  AiMessageType,
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

export type AiStreamingSlice = {
  streaming: AiStreamingState;
  resetStreaming: () => void;
  setStreamingStatus: (status: AiStreamingState['status']) => void;
  updateStreaming: (partial: Partial<AiStreamingState>) => void;
  setLastRequest: (request: AiChatRequest | undefined) => void;
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

/** Outcome of a diagram changeset or permission card, keyed by changesetId / requestId. */
export type AiReviewDecision = 'applied' | 'rejected' | 'confirmed';

export type AiToolSlice = {
  /** Live tool/diagram/permission cards of the turn being streamed. */
  agentItems: AiAgentItem[];
  appendAgentItem: (item: AiAgentItem) => void;
  updateToolTrace: (id: string, partial: Partial<AiToolTrace>) => void;
  clearAgentItems: () => void;
  reviews: Record<string, AiReviewDecision>;
  setReview: (id: string, decision: AiReviewDecision) => void;
};
