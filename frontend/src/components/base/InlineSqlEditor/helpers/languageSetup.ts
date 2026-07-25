import { shikiToMonaco } from '@shikijs/monaco';
import type * as Monaco from 'monaco-editor';
import { createHighlighter } from 'shiki/bundle/web';
import { themes } from '../../SqlEditor/helpers/constants';
import { completionService } from './inlineCompletionProvider';

let setupPromise: Promise<void> | null = null;

export const setupLanguage = async (monaco: typeof Monaco, theme: string) => {
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    const highlighter = await createHighlighter({
      themes: themes,
      langs: ['sql']
    });

    shikiToMonaco(highlighter, monaco);

    monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', '"', "'", '`'],
      provideCompletionItems: completionService
    });

    monaco.editor.setTheme(theme);
  })();

  return setupPromise;
};
