import type { AiMessageType } from '@/types';

export type AiStreamEvent =
  | { type: 'status'; label: string }
  | { type: 'thinking_start' }
  | { type: 'thinking_delta'; content: string }
  | { type: 'thinking_end'; durationMs: number }
  | { type: 'block_start'; blockType: 'explanation' | 'code'; language?: string }
  | { type: 'content_delta'; content: string }
  | { type: 'block_end' }
  | { type: 'tool_start'; label: string }
  | { type: 'tool_result'; label: string; content: string }
  | { type: 'tool_error'; label: string; content: string }
  | { type: 'done'; chatId: number; title: string; messages: AiMessageType[] }
  | { type: 'error'; message: string };

export type AiStreamCallbacks = {
  onEvent: (event: AiStreamEvent) => void;
  onError?: (error: Error) => void;
};
