import type { AiChatType, AiBridgeRequest, AiContextType, AiMessageType, AiProviderType } from '@/types';
import type { AiChatRequest } from '@/api/ai/types';

export type AiStreamingPhase = 'context' | 'thinking' | 'answering';

export type ToolStep = {
  id: string;
  name: string;
  status: 'running' | 'done' | 'error';
  result?: string;
  error?: string;
};

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
  toolSteps?: ToolStep[];
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
  toggleMessageEdit: () => void;
  updateContext: (context: AiContextType) => void;
};

export type AiBridgeSlice = {
  bridgeRequest: AiBridgeRequest | null;
  setBridgeRequest: (request: AiBridgeRequest | null) => void;
};

export type AiToolSlice = {
  toolSteps: ToolStep[];
  appendToolStep: (step: ToolStep) => void;
  updateToolStep: (id: string, partial: Partial<ToolStep>) => void;
  clearToolSteps: () => void;
};
