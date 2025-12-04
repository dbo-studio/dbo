import { shikiToMonaco } from '@shikijs/monaco';
import type * as Monaco from 'monaco-editor';
import { createHighlighter } from 'shiki/bundle/web';
import { completionService } from './completionService';
import { registerInlineAIProvider } from './registerInlineAIProvider';

let isSetup = false;

export const setupLanguage = async (monaco: typeof Monaco) => {
  if (isSetup) return;

  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: ['sql', 'json']
  });

  shikiToMonaco(highlighter, monaco);

  monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: [' ', '.', '"', "'", '`'],
    provideCompletionItems: completionService
  });

  registerInlineAIProvider(monaco, 'sql');

  isSetup = true;
};
