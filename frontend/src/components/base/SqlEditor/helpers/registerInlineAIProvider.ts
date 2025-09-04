import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type * as MonacoNS from 'monaco-editor/esm/vs/editor/editor.api';

type CompletionItemType = {
  insertText: string;
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
};

const DEBOUNCE_DELAY = 300;
const MIN_TEXT_LENGTH = 10;

let currentRequest: AbortController | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

function createCompletionItem(text: string, position: MonacoNS.Position): CompletionItemType {
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

function getTextRange(model: MonacoNS.editor.ITextModel, position: MonacoNS.Position) {
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
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
}

async function fetchCompletion(requestData: any): Promise<string> {
  const response = await api.ai.complete(requestData);
  return response.completion ?? '';
}

export function registerInlineAIProvider(monaco: typeof MonacoNS, languageId: string) {
  monaco.languages.registerInlineCompletionsProvider(languageId, {
    provideInlineCompletions: async (model, position, _, token) => {
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

      if (prefix.trim().length < MIN_TEXT_LENGTH) {
        return { items: [] };
      }

      cleanupPreviousRequest();

      return new Promise((resolve) => {
        debounceTimer = setTimeout(async () => {
          try {
            currentRequest = new AbortController();

            const requestData = {
              connectionId: currentConnection()?.id ?? 0,
              contextOpts: {
                database: currentConnection()?.options?.database,
                schema: currentConnection()?.options?.schema,
                prompt: prefix,
                suffix: suffix
              }
            };

            const completionText = await fetchCompletion(requestData);

            if (!completionText.trim()) {
              resolve({ items: [] });
              return;
            }

            resolve({
              items: [createCompletionItem(completionText, position)]
            });
          } catch (err) {
            useSettingStore.getState().toggleEnableEditorAi(false);
            console.debug('Inline AI provider error:', err);
            resolve({ items: [] });
          } finally {
            currentRequest = null;
          }
        }, DEBOUNCE_DELAY);
      });
    },
    freeInlineCompletions: () => {}
  });
}
