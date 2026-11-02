import type { AiChangeset, AiPlanStep, AiMessageType } from '@/types';

export type AiStreamEvent =
  | { type: 'status'; label: string }
  | { type: 'thinking_start' }
  | { type: 'thinking_delta'; content: string }
  | { type: 'thinking_end'; durationMs: number }
  | { type: 'block_start'; blockType: 'explanation' | 'code'; language?: string }
  | { type: 'content_delta'; content: string }
  | { type: 'block_end' }
  | { type: 'tool_start'; id?: string; label: string; content?: string }
  | { type: 'tool_result'; id?: string; label: string; content: string; durationMs?: number }
  | {
      type: 'tool_error';
      id?: string;
      label: string;
      content: string;
      durationMs?: number;
      data?: { code: 'blocked'; reason: string };
    }
  | { type: 'diagram_diff'; id: string; data: AiChangeset }
  | { type: 'plan_delta'; id: string; data: { steps: AiPlanStep[] } }
  | { type: 'ping' }
  | { type: 'done'; chatId: number; title: string; messages: AiMessageType[] }
  | { type: 'error'; message: string };

export type AiStreamCallbacks = {
  onEvent: (event: AiStreamEvent) => void;
  onError?: (error: Error) => void;
};
