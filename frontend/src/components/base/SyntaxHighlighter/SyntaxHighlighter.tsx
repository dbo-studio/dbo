import { type JSX, useEffect, useState } from 'react';
import { codeToHtml } from 'shiki/bundle/web';
import { SyntaxHighlighterStyled } from './SyntaxHighlighter.styled';
import type { SyntaxHighlighterProps } from './types';

export default function SyntaxHighlighter({ value, isDark }: SyntaxHighlighterProps): JSX.Element {
  const [html, setHtml] = useState('');

  useEffect(() => {
    shikiWrapper(value, isDark ?? false).then((_html) => setHtml(_html));
  }, [value]);

  return (
    <SyntaxHighlighterStyled>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </SyntaxHighlighterStyled>
  );
}

const shikiWrapper = async (value: string, isDark: boolean): Promise<string> => {
  return await codeToHtml(value, {
    lang: 'sql',
    theme: isDark ? 'github-dark' : 'github-light'
  });
};
