import { shikiToMonaco } from '@shikijs/monaco';
import type * as Monaco from 'monaco-editor';
import { createHighlighter } from 'shiki/bundle/web';
import { completionService } from './completionService';
import { registerInlineAIProvider } from './registerInlineAIProvider';

let setupPromise: Promise<void> | null = null;

export const setupLanguage = async (monaco: typeof Monaco, theme: string) => {
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    const highlighter = await createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: ['sql', 'json', 'html', 'yml', 'markdown']
    });

    shikiToMonaco(highlighter, monaco);

    monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', '"', "'", '`'],
      provideCompletionItems: completionService
    });

    monaco.editor.setTheme(theme);

    registerInlineAIProvider(monaco, 'sql');
  })();

  return setupPromise;
};

export const waitForLanguageSetup = (): Promise<void> => {
  return setupPromise ?? Promise.resolve();
};
