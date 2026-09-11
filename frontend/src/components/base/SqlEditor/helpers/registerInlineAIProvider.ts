import api from '@/api';
import type { AICompleteRequest } from '@/api/ai/types';
import { getAiStatus } from '@/core/ai/aiStatus';
import { getEditorSessionContext } from '@/hooks/useEditorSessionContext';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type * as Monaco from 'monaco-editor';
import { DEBOUNCE_DELAYS, MIN_TEXT_LENGTH_FOR_AI } from './constants';
import { createCompletionItem, getTextRange, sanitizeInlineCompletion } from './inlineCompletionUtils';

type InlineCompletionResult = Monaco.languages.InlineCompletions;

type InlineAiSession = {
  generation: number;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  abortController: AbortController | null;
  pendingResolve: ((result: InlineCompletionResult) => void) | null;
};

const emptyResult: InlineCompletionResult = { items: [] };

let inlineAiSession: InlineAiSession = {
  generation: 0,
  debounceTimer: null,
  abortController: null,
  pendingResolve: null
};

function resolvePending(result: InlineCompletionResult) {
  const resolve = inlineAiSession.pendingResolve;
  inlineAiSession.pendingResolve = null;
  resolve?.(result);
}

function cancelInlineAiSession() {
  inlineAiSession.generation += 1;

  if (inlineAiSession.debounceTimer !== null) {
    clearTimeout(inlineAiSession.debounceTimer);
    inlineAiSession.debounceTimer = null;
  }

  if (inlineAiSession.abortController) {
    inlineAiSession.abortController.abort();
    inlineAiSession.abortController = null;
  }

  resolvePending(emptyResult);
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'CanceledError' || err.name === 'AbortError' || err.message.includes('canceled'))
  );
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
      if (!useSettingStore.getState().editor.enableEditorAi || !getAiStatus(useAiStore.getState().providers).ready) {
        return emptyResult;
      }

      if (token.isCancellationRequested) {
        return emptyResult;
      }

      const currentConnection = useConnectionStore.getState().currentConnection;

      if (!currentConnection()?.id) {
        return emptyResult;
      }

      if (getTextRange(model, position).prefix.trim().length < MIN_TEXT_LENGTH_FOR_AI) {
        return emptyResult;
      }

      cancelInlineAiSession();

      const initialPosition = position;

      return new Promise<InlineCompletionResult>((resolve) => {
        const generation = inlineAiSession.generation;
        inlineAiSession.pendingResolve = resolve;

        const cancelSubscription = token.onCancellationRequested(() => {
          if (inlineAiSession.generation === generation) {
            cancelInlineAiSession();
          }
        });

        const finish = (result: InlineCompletionResult) => {
          cancelSubscription.dispose();
          if (inlineAiSession.pendingResolve === resolve) {
            resolvePending(result);
          }
        };

        inlineAiSession.debounceTimer = setTimeout(() => {
          inlineAiSession.debounceTimer = null;

          if (inlineAiSession.generation !== generation) {
            return;
          }

          void (async () => {
            if (token.isCancellationRequested || inlineAiSession.generation !== generation) {
              finish(emptyResult);
              return;
            }

            const currentPosition = model.getPositionAt(model.getOffsetAt(initialPosition));

            if (model.isDisposed()) {
              finish(emptyResult);
              return;
            }

            const { prefix, suffix } = getTextRange(model, currentPosition);

            if (prefix.trim().length < MIN_TEXT_LENGTH_FOR_AI) {
              finish(emptyResult);
              return;
            }

            const abortController = new AbortController();
            const abortSignal = abortController.signal;
            inlineAiSession.abortController = abortController;

            try {
              if (!getAiStatus(useAiStore.getState().providers).ready) {
                finish(emptyResult);
                return;
              }

              const session = getEditorSessionContext();
              const requestData: AICompleteRequest = {
                connectionId: currentConnection()?.id ?? 0,
                contextOpts: {
                  database: session.database,
                  schema: session.schema,
                  prompt: prefix,
                  suffix: suffix
                }
              };

              const rawCompletion = await fetchCompletion(requestData, abortSignal);

              if (
                abortSignal.aborted ||
                token.isCancellationRequested ||
                inlineAiSession.generation !== generation
              ) {
                finish(emptyResult);
                return;
              }

              const completionText = sanitizeInlineCompletion(prefix, suffix, rawCompletion);

              if (!model.isDisposed() && completionText.trim()) {
                const finalPosition = model.getPositionAt(
                  Math.min(model.getOffsetAt(currentPosition), model.getValueLength())
                );

                finish({
                  items: [createCompletionItem(completionText, finalPosition)]
                });
              } else {
                finish(emptyResult);
              }
            } catch (err) {
              if (isAbortError(err)) {
                finish(emptyResult);
                return;
              }

              finish(emptyResult);
            } finally {
              if (inlineAiSession.abortController === abortController) {
                inlineAiSession.abortController = null;
              }
            }
          })();
        }, DEBOUNCE_DELAYS.inlineAIProvider);
      });
    },
    disposeInlineCompletions: () => {
      cancelInlineAiSession();
    }
  });
}
