import api from '@/api';
import type { AICompleteRequest } from '@/api/ai/types';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type * as Monaco from 'monaco-editor';
import { DEBOUNCE_DELAYS, MIN_TEXT_LENGTH_FOR_AI } from './constants';

type CompletionItemType = {
  insertText: string;
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
};

let currentRequest: AbortController | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

function createCompletionItem(text: string, position: Monaco.Position): CompletionItemType {
  // For inline completions, range should start and end at the current cursor position
  // Monaco will handle displaying the suggestion as "ghost text" after the cursor
  return {
    insertText: text,
    range: {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    }
  };
}

function getTextRange(model: Monaco.editor.ITextModel, position: Monaco.Position) {
  const prefix = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  });

  const suffix = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: model.getLineCount(),
    endColumn: model.getLineMaxColumn(model.getLineCount())
  });

  return { prefix, suffix };
}

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
      if (!useSettingStore.getState().enableEditorAi) {
        return { items: [] };
      }

      if (token.isCancellationRequested) {
        return { items: [] };
      }

      const currentConnection = useConnectionStore.getState().currentConnection;

      if (!currentConnection()?.id) {
        return { items: [] };
      }

      const { prefix, suffix } = getTextRange(model, position);

      if (prefix.trim().length < MIN_TEXT_LENGTH_FOR_AI) {
        return { items: [] };
      }

      // Cancel any previous request and clear debounce timer
      cleanupPreviousRequest();

      // Capture initial position and model
      const initialPosition = position;

      return new Promise((resolve) => {
        // Set up debounce timer for this request
        const timerId = setTimeout(async () => {
          // Check if this timer was cancelled by cleanupPreviousRequest
          if (debounceTimer !== timerId) {
            resolve({ items: [] });
            return;
          }

          // Clear timer reference as we're about to make the request
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

          // Cancel previous request if exists
          if (currentRequest) {
            currentRequest.abort();
          }

          // Create new AbortController for this request
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

            const requestData: AICompleteRequest = {
              connectionId: currentConnection()?.id ?? 0,
              providerId: activeProvider.id,
              model: activeProvider.model,
              contextOpts: {
                database: currentConnection()?.options?.database,
                schema: currentConnection()?.options?.schema,
                prompt: prefix,
                suffix: suffix
              }
            };

            const completionText = await fetchCompletion(requestData, abortSignal);

            if (abortSignal.aborted || token.isCancellationRequested) {
              resolve({ items: [] });
              return;
            }

            if (!model.isDisposed() && completionText.trim()) {
              const finalPosition = model.getPositionAt(
                Math.min(model.getOffsetAt(currentPosition), model.getValueLength())
              );

              const completionItem = createCompletionItem(completionText, finalPosition);
              console.debug('Inline AI completion created:', {
                textLength: completionText.length,
                preview: completionText.substring(0, 50),
                position: finalPosition,
                range: completionItem.range
              });
              resolve({
                items: [completionItem]
              });
            } else {
              console.debug('Inline AI completion skipped:', {
                modelDisposed: model.isDisposed(),
                textEmpty: !completionText.trim()
              });
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
            useSettingStore.getState().toggleEnableEditorAi(false);
            resolve({ items: [] });
          } finally {
            // Clear current request reference if this is still the active request and wasn't aborted
            if (currentRequest === abortController && !abortSignal.aborted) {
              currentRequest = null;
            }
          }
        }, DEBOUNCE_DELAYS.inlineAIProvider);

        // Store timer ID so we can check if it was cancelled
        debounceTimer = timerId;
      });
    },
    disposeInlineCompletions: () => {
      cleanupPreviousRequest();
    }
  });
}
