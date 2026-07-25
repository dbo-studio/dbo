import { shikiToMonaco } from '@shikijs/monaco';
import type * as Monaco from 'monaco-editor';
import { createHighlighter } from 'shiki/bundle/web';
import { themes } from '../../SqlEditor/helpers/constants';

let setupPromise: Promise<void> | null = null;

export const setupLanguage = async (monaco: typeof Monaco, theme: string) => {
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    const highlighter = await createHighlighter({
      themes: themes,
      langs: ['sql', 'json', 'html', 'yml', 'markdown']
    });

    shikiToMonaco(highlighter, monaco);

    monaco.editor.setTheme(theme);
  })();

  return setupPromise;
};
