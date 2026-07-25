import { streamChat } from '@/api/ai/streamChat';
import type { AiStreamEvent } from '@/api/ai/streamTypes';
import type { AiChatRequest } from '@/api/ai/types';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useCallback, useRef } from 'react';

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
  const appendToolStep = useAiStore((state) => state.appendToolStep);
  const updateToolStep = useAiStore((state) => state.updateToolStep);
  const clearToolSteps = useAiStore((state) => state.clearToolSteps);

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
      clearToolSteps();
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
            appendToolStep({
              id: `${event.label}-${Date.now()}`,
              name: event.label,
              status: 'running'
            });
            break;
          case 'tool_result':
            updateToolStep(
              useAiStore.getState().toolSteps.find((s) => s.name === event.label && s.status === 'running')?.id ??
                `${event.label}-done`,
              { status: 'done', result: event.content }
            );
            break;
          case 'tool_error':
            updateToolStep(
              useAiStore.getState().toolSteps.find((s) => s.name === event.label && s.status === 'running')?.id ??
                `${event.label}-error`,
              { status: 'error', error: event.content }
            );
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
      } catch (error) {
        if (controller.signal.aborted) {
          return null;
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
      appendToolStep,
      clearToolSteps,
      resetStreaming,
      setLastRequest,
      setStreamingStatus,
      updateStreaming,
      updateToolStep
    ]
  );

  const isStreaming = useAiStore((state) => state.streaming.status === 'streaming');

  return { isStreaming, sendStream, cancelStream };
};
