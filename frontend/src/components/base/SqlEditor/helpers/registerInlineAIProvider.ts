import api from '@/api';
import type { AICompleteRequest } from '@/api/ai/types';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type * as Monaco from 'monaco-editor';
import { DEBOUNCE_DELAYS, MIN_TEXT_LENGTH_FOR_AI } from './constants';
import { createCompletionItem, getTextRange, sanitizeInlineCompletion } from './inlineCompletionUtils';

let currentRequest: AbortController | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function cleanupPreviousRequest() {
  if (currentRequest) {
    currentRequest.abort();
    currentRequest = null;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

async function fetchCompletion(requestData: AICompleteRequest, signal?: AbortSignal): Promise<string> {
  const response = await api.ai.complete(requestData, signal);
  return response.completion ?? '';
}

export function registerInlineAIProvider(monaco: typeof Monaco, languageId: string) {
  monaco.languages.registerInlineCompletionsProvider(languageId, {
    provideInlineCompletions: async (
      model: Monaco.editor.ITextModel,
      position: Monaco.Position,
      _context: Monaco.languages.InlineCompletionContext,
      token: Monaco.CancellationToken
    ) => {
      if (!useSettingStore.getState().editor.enableEditorAi) {
        return { items: [] };
      }

      if (token.isCancellationRequested) {
        return { items: [] };
      }

      const currentConnection = useConnectionStore.getState().currentConnection;

      if (!currentConnection()?.id) {
        return { items: [] };
      }

      if (getTextRange(model, position).prefix.trim().length < MIN_TEXT_LENGTH_FOR_AI) {
        return { items: [] };
      }

      cleanupPreviousRequest();

      const initialPosition = position;

      return new Promise((resolve) => {
        const timerId = setTimeout(() => {
          void (async () => {
            if (debounceTimer !== timerId) {
              resolve({ items: [] });
              return;
            }

            debounceTimer = null;

            if (token.isCancellationRequested) {
              resolve({ items: [] });
              return;
            }

            const currentPosition = model.getPositionAt(model.getOffsetAt(initialPosition));

            if (model.isDisposed()) {
              resolve({ items: [] });
              return;
            }

            const { prefix, suffix } = getTextRange(model, currentPosition);

            if (prefix.trim().length < MIN_TEXT_LENGTH_FOR_AI) {
              resolve({ items: [] });
              return;
            }

            if (currentRequest) {
              currentRequest.abort();
            }

            const abortController = new AbortController();
            const abortSignal = abortController.signal;
            currentRequest = abortController;

            try {
              const providers = useAiStore.getState().providers;
              const activeProvider = providers?.find((p) => p.isActive);

              if (!activeProvider) {
                resolve({ items: [] });
                return;
              }

              const options = currentConnection()?.options;
              const requestData: AICompleteRequest = {
                connectionId: currentConnection()?.id ?? 0,
                providerId: activeProvider.id,
                model: activeProvider.model,
                contextOpts: {
                  database: options && 'database' in options ? options.database : undefined,
                  // Connection options do not carry schema; callers rely on SQL context / prompt.
                  schema: undefined,
                  prompt: prefix,
                  suffix: suffix
                }
              };

              const rawCompletion = await fetchCompletion(requestData, abortSignal);

              if (abortSignal.aborted || token.isCancellationRequested) {
                resolve({ items: [] });
                return;
              }

              const completionText = sanitizeInlineCompletion(prefix, suffix, rawCompletion);

              if (!model.isDisposed() && completionText.trim()) {
                const finalPosition = model.getPositionAt(
                  Math.min(model.getOffsetAt(currentPosition), model.getValueLength())
                );

                resolve({
                  items: [createCompletionItem(completionText, finalPosition)]
                });
              } else {
                resolve({ items: [] });
              }
            } catch (err) {
              if (
                err instanceof Error &&
                (err.name === 'CanceledError' || err.name === 'AbortError' || err.message.includes('canceled'))
              ) {
                resolve({ items: [] });
                return;
              }

              console.debug('Inline AI provider error:', err);
              useSettingStore.getState().updateEditor({ enableEditorAi: false });
              resolve({ items: [] });
            } finally {
              if (currentRequest === abortController && !abortSignal.aborted) {
                currentRequest = null;
              }
            }
          })();
        }, DEBOUNCE_DELAYS.inlineAIProvider);

        debounceTimer = timerId;
      });
    },
    disposeInlineCompletions: () => {
      cleanupPreviousRequest();
    }
  });
}
