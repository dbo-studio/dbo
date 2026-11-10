import { streamChat } from '@/api/ai/streamChat';
import type { AiStreamEvent } from '@/api/ai/streamTypes';
import type { AiChatRequest } from '@/api/ai/types';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiStreamingState } from '@/store/aiStore/types';
import { useChangesetStore } from '@/store/changesetStore/changeset.store';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useAiSession } from './useAiSession';

/** Older backends send no tool call id; fall back to the running card with that tool name. */
const runningToolId = (chatId: number, id: string | undefined, name: string): string => {
  if (id) return id;
  const running = useAiStore
    .getState()
    .sessions[chatId]?.agentItems.find(
      (item) => item.kind === 'tool' && item.trace.name === name && item.trace.status === 'running'
    );
  return running?.kind === 'tool' ? running.trace.id : '';
};

type UseAiStreamReturn = {
  /** The open chat is streaming. */
  isStreaming: boolean;
  sendStream: (request: AiChatRequest) => Promise<AiStreamEvent | null>;
  cancelStream: (chatId: number) => void;
  cancelAllStreams: () => void;
};

/** Streams chat turns; each chat has its own stream, state and abort handle. */
const REPORT_TOOLS = new Set([
  'save_report',
  'pin_report',
  'update_report',
  'delete_report',
  'rename_board',
  'delete_board',
  'unpin_report'
]);

export const useAiStream = (): UseAiStreamReturn => {
  const controllersRef = useRef(new Map<number, AbortController>());
  const queryClient = useQueryClient();

  const resetStreaming = useAiStore((state) => state.resetStreaming);
  const setStreamingStatus = useAiStore((state) => state.setStreamingStatus);
  const updateStreaming = useAiStore((state) => state.updateStreaming);
  const setLastRequest = useAiStore((state) => state.setLastRequest);
  const appendAgentItem = useAiStore((state) => state.appendAgentItem);
  const setPlan = useAiStore((state) => state.setPlan);
  const updateToolTrace = useAiStore((state) => state.updateToolTrace);
  const clearAgentItems = useAiStore((state) => state.clearAgentItems);

  const cancelStream = useCallback(
    (chatId: number) => {
      controllersRef.current.get(chatId)?.abort();
      controllersRef.current.delete(chatId);
      resetStreaming(chatId);
    },
    [resetStreaming]
  );

  const cancelAllStreams = useCallback(() => {
    for (const chatId of [...controllersRef.current.keys()]) cancelStream(chatId);
  }, [cancelStream]);

  const sendStream = useCallback(
    async (request: AiChatRequest): Promise<AiStreamEvent | null> => {
      const chatId = Number(request.chatId);
      const controller = new AbortController();
      controllersRef.current.set(chatId, controller);

      resetStreaming(chatId);
      clearAgentItems(chatId);
      setStreamingStatus(chatId, 'streaming');
      setLastRequest(chatId, request);

      let doneEvent: AiStreamEvent | null = null;

      const streamed = (): AiStreamingState => useAiStore.getState().sessions[chatId].streaming;

      const handleEvent = (event: AiStreamEvent): void => {
        switch (event.type) {
          case 'status':
            updateStreaming(chatId, { phase: 'context', statusLabel: event.label });
            break;
          case 'thinking_start':
            updateStreaming(chatId, {
              phase: 'thinking',
              thinkingStartedAt: Date.now(),
              thinkingContent: ''
            });
            break;
          case 'thinking_delta':
            updateStreaming(chatId, {
              phase: 'thinking',
              thinkingContent: streamed().thinkingContent + event.content
            });
            break;
          case 'thinking_end':
            updateStreaming(chatId, {
              thinkingDurationMs: event.durationMs
            });
            break;
          case 'block_start':
            updateStreaming(chatId, {
              phase: 'answering',
              activeBlockType: event.blockType,
              previewContent: ''
            });
            break;
          case 'content_delta':
            updateStreaming(chatId, {
              phase: 'answering',
              previewContent: streamed().previewContent + event.content
            });
            break;
          case 'tool_start':
            appendAgentItem(chatId, {
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
            updateToolTrace(chatId, runningToolId(chatId, event.id, event.label), {
              status: 'done',
              result: event.content,
              durationMs: event.durationMs
            });
            // The agent changed a report or a board: lists already loaded are out of date.
            if (REPORT_TOOLS.has(event.label ?? '')) {
              void queryClient.invalidateQueries({ queryKey: ['questions'], refetchType: 'all' });
              void queryClient.invalidateQueries({ queryKey: ['dashboards'], refetchType: 'all' });
            }
            break;
          case 'tool_error':
            updateToolTrace(chatId, runningToolId(chatId, event.id, event.label), {
              status: event.data?.code === 'blocked' ? 'blocked' : 'error',
              error: event.content,
              durationMs: event.durationMs
            });
            break;
          case 'diagram_diff':
            appendAgentItem(chatId, { kind: 'diagram_diff', changesetId: event.data.id });
            // Show the proposal on the matching diagram while the turn streams.
            useChangesetStore.getState().stage(event.data);
            break;
          case 'plan_delta':
            setPlan(chatId, event.data.steps);
            break;
          case 'error':
            updateStreaming(chatId, { error: event.message });
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
              updateStreaming(chatId, { error: error.message });
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
        updateStreaming(chatId, { error: message });
        throw error;
      } finally {
        if (controllersRef.current.get(chatId) === controller) controllersRef.current.delete(chatId);
        setStreamingStatus(chatId, 'idle');
      }

      return doneEvent;
    },
    [
      appendAgentItem,
      clearAgentItems,
      queryClient,
      setPlan,
      resetStreaming,
      setLastRequest,
      setStreamingStatus,
      updateStreaming,
      updateToolTrace
    ]
  );

  const isStreaming = useAiSession().streaming.status === 'streaming';

  return { isStreaming, sendStream, cancelStream, cancelAllStreams };
};
