import type { AiDiagramDiff, AiMessageType, AiPermissionRequest } from '@/types';

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
  | { type: 'diagram_diff'; id: string; data: AiDiagramDiff }
  | { type: 'permission_request'; id: string; data: AiPermissionRequest }
  | { type: 'ping' }
  | { type: 'done'; chatId: number; title: string; messages: AiMessageType[] }
  | { type: 'error'; message: string };

export type AiStreamCallbacks = {
  onEvent: (event: AiStreamEvent) => void;
  onError?: (error: Error) => void;
};
