import { complete as apiComplete } from '@/api/ai';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type * as MonacoNS from 'monaco-editor/esm/vs/editor/editor.api';

export function registerInlineAIProvider(monaco: typeof MonacoNS, languageId: string) {
  monaco.languages.registerInlineCompletionsProvider(languageId, {
    provideInlineCompletions: async (model, position, _context, _token) => {
      const { settings } = useAiStore.getState();
      const { currentConnection } = useConnectionStore.getState();
      const connection = currentConnection();
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
      if (!prefix.trim()) return { items: [] };
      try {
        const ai = await apiComplete({
          connectionId: connection?.id ?? 0,
          prompt: prefix,
          suffix,
          language: model.getLanguageId(),
          provider: {
            providerId: 'openai-compatible',
            baseUrl: settings.baseUrl,
            apiKey: settings.apiKey,
            model: settings.model,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens
          }
        });
        const text = ai.completion ?? '';
        if (!text.trim()) return { items: [] };
        return {
          items: [
            {
              insertText: text,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              }
            }
          ]
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.debug('inline AI provider error', err);
        return { items: [] };
      }
    },
    freeInlineCompletions: () => {}
  });
}
