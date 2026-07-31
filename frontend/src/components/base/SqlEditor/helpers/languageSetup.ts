import { shikiToMonaco } from '@shikijs/monaco';
import type * as Monaco from 'monaco-editor';
import { createHighlighter } from 'shiki/bundle/web';
import { completionService } from './completionService';
import { themes } from './constants';
import { registerInlineAIProvider } from './registerInlineAIProvider';

let setupPromise: Promise<void> | null = null;

export const setupLanguage = async (monaco: typeof Monaco, theme: string) => {
  if (!setupPromise) {
    setupPromise = (async () => {
      const highlighter = await createHighlighter({
        themes: themes,
        langs: ['sql', 'json', 'html', 'yml', 'markdown']
      });

      shikiToMonaco(highlighter, monaco);

      monaco.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: [' ', '.', '"', "'", '`'],
        provideCompletionItems: completionService
      });

      registerInlineAIProvider(monaco, 'sql');
    })().catch((error: unknown) => {
      setupPromise = null;
      throw error;
    });
  }

  await setupPromise;
  monaco.editor.setTheme(theme);
};
