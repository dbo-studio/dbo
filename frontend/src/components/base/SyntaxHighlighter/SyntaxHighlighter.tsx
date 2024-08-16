import { codeToHtml } from 'shiki';

export const SyntaxHighlighter = async (value: string, isDark: boolean) => {
  return await codeToHtml(value, {
    lang: 'sql',
    theme: isDark ? 'github-dark' : 'github-light'
  });
};
