import { codeToHtml } from 'shiki';

export const SyntaxHighlighter = async (value: string) => {
  return await codeToHtml(value, {
    lang: 'sql',
    theme: 'github-light'
  });
};
