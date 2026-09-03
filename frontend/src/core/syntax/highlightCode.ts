import type { SyntaxHighlighterLang } from '@/components/base/SyntaxHighlighter/types';
import { createHighlighter, type Highlighter } from 'shiki/bundle/web';
import dbmlGrammar from './dbml.tmLanguage.json';

const THEMES = ['github-light', 'github-dark'] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

const getHighlighter = (): Promise<Highlighter> => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [...THEMES],
      langs: ['sql', 'json', 'text', dbmlGrammar]
    }).catch((error: unknown) => {
      highlighterPromise = null;
      throw error;
    });
  }

  return highlighterPromise;
};

export const highlightCode = async (value: string, lang: SyntaxHighlighterLang, theme: string): Promise<string> => {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(value, { lang, theme });
};
