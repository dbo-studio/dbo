import { api } from '@/core/api';
import { normalizeAiChatRequest } from './normalizeAiChatRequest';
import type { AiChatRequest } from './types';
import type { AiStreamCallbacks, AiStreamEvent } from './streamTypes';

const getStreamUrl = (): string => {
  const baseURL = api.defaults.baseURL ?? import.meta.env.VITE_PUBLIC_SERVER_URL ?? '/api';
  const normalized = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;

  // Relative URLs keep requests same-origin so session cookies (dbo_sid) are sent.
  if (normalized.startsWith('/')) {
    return `${normalized}/ai/chat/stream`;
  }

  return `${normalized}/ai/chat/stream`;
};

const parseStreamLine = (line: string): AiStreamEvent | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as AiStreamEvent;
  } catch {
    return null;
  }
};

const getStreamHeaders = (): Record<string, string> => {
  const common = api.defaults.headers.common as Record<string, string | undefined>;

  return {
    ...(common['X-Client-Mode'] ? { 'X-Client-Mode': common['X-Client-Mode'] } : {}),
    'Content-Type': 'application/json'
  };
};

export const streamChat = async (
  data: AiChatRequest,
  callbacks: AiStreamCallbacks,
  signal?: AbortSignal
): Promise<void> => {
  const payload = normalizeAiChatRequest(data);

  const response = await fetch(getStreamUrl(), {
    method: 'POST',
    headers: getStreamHeaders(),
    body: JSON.stringify(payload),
    signal,
    credentials: 'include'
  });

  if (!response.ok) {
    let details = `Stream request failed with status ${response.status}`;
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        details = errorBody.message;
      }
    } catch {
      // ignore parse errors
    }

    const error = new Error(details);
    callbacks.onError?.(error);
    throw error;
  }

  if (!response.body) {
    const error = new Error('Stream response has no body');
    callbacks.onError?.(error);
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const event = parseStreamLine(line);
        if (event) {
          callbacks.onEvent(event);
        }
      }
    }

    if (buffer.trim()) {
      const event = parseStreamLine(buffer);
      if (event) {
        callbacks.onEvent(event);
      }
    }
  } catch (error) {
    if (signal?.aborted) return;
    const err = error instanceof Error ? error : new Error('Stream read failed');
    callbacks.onError?.(err);
    throw err;
  }
};
