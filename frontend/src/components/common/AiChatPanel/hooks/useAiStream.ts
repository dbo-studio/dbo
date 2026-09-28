import { streamChat } from '@/api/ai/streamChat';
import type { AiStreamEvent } from '@/api/ai/streamTypes';
import type { AiChatRequest } from '@/api/ai/types';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useDiagramChangesetStore } from '@/store/diagramChangesetStore/diagramChangeset.store';
import { useCallback, useRef } from 'react';

/** Older backends send no tool call id; fall back to the running card with that tool name. */
const runningToolId = (id: string | undefined, name: string): string => {
  if (id) return id;
  const running = useAiStore
    .getState()
    .agentItems.find((item) => item.kind === 'tool' && item.trace.name === name && item.trace.status === 'running');
  return running?.kind === 'tool' ? running.trace.id : '';
};

type UseAiStreamReturn = {
  isStreaming: boolean;
  sendStream: (request: AiChatRequest) => Promise<AiStreamEvent | null>;
  cancelStream: () => void;
};

export const useAiStream = (): UseAiStreamReturn => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetStreaming = useAiStore((state) => state.resetStreaming);
  const setStreamingStatus = useAiStore((state) => state.setStreamingStatus);
  const updateStreaming = useAiStore((state) => state.updateStreaming);
  const setLastRequest = useAiStore((state) => state.setLastRequest);
  const appendAgentItem = useAiStore((state) => state.appendAgentItem);
  const updateToolTrace = useAiStore((state) => state.updateToolTrace);
  const clearAgentItems = useAiStore((state) => state.clearAgentItems);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    resetStreaming();
  }, [resetStreaming]);

  const sendStream = useCallback(
    async (request: AiChatRequest): Promise<AiStreamEvent | null> => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      resetStreaming();
      clearAgentItems();
      setStreamingStatus('streaming');
      setLastRequest(request);

      let doneEvent: AiStreamEvent | null = null;

      const handleEvent = (event: AiStreamEvent): void => {
        switch (event.type) {
          case 'status':
            updateStreaming({ phase: 'context', statusLabel: event.label });
            break;
          case 'thinking_start':
            updateStreaming({
              phase: 'thinking',
              thinkingStartedAt: Date.now(),
              thinkingContent: ''
            });
            break;
          case 'thinking_delta':
            updateStreaming({
              phase: 'thinking',
              thinkingContent: useAiStore.getState().streaming.thinkingContent + event.content
            });
            break;
          case 'thinking_end':
            updateStreaming({
              thinkingDurationMs: event.durationMs
            });
            break;
          case 'block_start':
            updateStreaming({
              phase: 'answering',
              activeBlockType: event.blockType,
              previewContent: ''
            });
            break;
          case 'content_delta':
            updateStreaming({
              phase: 'answering',
              previewContent: useAiStore.getState().streaming.previewContent + event.content
            });
            break;
          case 'tool_start':
            appendAgentItem({
              kind: 'tool',
              trace: {
                id: event.id ?? `${event.label}-${Date.now()}`,
                name: event.label,
                args: event.content,
                status: 'running'
              }
            });
            break;
          case 'tool_result':
            updateToolTrace(runningToolId(event.id, event.label), {
              status: 'done',
              result: event.content,
              durationMs: event.durationMs
            });
            break;
          case 'tool_error':
            updateToolTrace(runningToolId(event.id, event.label), {
              status: event.data?.code === 'blocked' ? 'blocked' : 'error',
              error: event.content,
              durationMs: event.durationMs
            });
            break;
          case 'diagram_diff':
            appendAgentItem({ kind: 'diagram_diff', diff: event.data });
            // Show the proposal on the matching diagram while the turn streams.
            useDiagramChangesetStore.getState().stage(event.data);
            break;
          case 'permission_request':
            appendAgentItem({ kind: 'permission', request: event.data });
            break;
          case 'error':
            updateStreaming({ error: event.message });
            break;
          case 'done':
            doneEvent = event;
            break;
          default:
            break;
        }
      };

      try {
        await streamChat(
          request,
          {
            onEvent: handleEvent,
            onError: (error) => {
              updateStreaming({ error: error.message });
            }
          },
          controller.signal
        );
        // streamChat may resolve quietly after abort (reader path) — still treat as cancel.
        if (controller.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
      } catch (error) {
        if (controller.signal.aborted) {
          throw error instanceof Error && error.name === 'AbortError'
            ? error
            : new DOMException('Aborted', 'AbortError');
        }
        const message = error instanceof Error ? error.message : 'Stream failed';
        updateStreaming({ error: message });
        throw error;
      } finally {
        abortControllerRef.current = null;
        setStreamingStatus('idle');
      }

      return doneEvent;
    },
    [
      appendAgentItem,
      clearAgentItems,
      resetStreaming,
      setLastRequest,
      setStreamingStatus,
      updateStreaming,
      updateToolTrace
    ]
  );

  const isStreaming = useAiStore((state) => state.streaming.status === 'streaming');

  return { isStreaming, sendStream, cancelStream };
};
