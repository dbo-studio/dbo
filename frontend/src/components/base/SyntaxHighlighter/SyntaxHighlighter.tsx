import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useEffect, useState } from 'react';
import { codeToHtml } from 'shiki/bundle/web';
import { SyntaxHighlighterStyled } from './SyntaxHighlighter.styled';
import type { SyntaxHighlighterProps } from './types';

export default function SyntaxHighlighter({ value, lang = 'sql' }: SyntaxHighlighterProps): JSX.Element {
  const [html, setHtml] = useState('');
  const theme = useSettingStore((state) => state.theme.editorTheme);

  useEffect(() => {
    shikiWrapper(value, theme, lang)
      .then((_html) => setHtml(_html))
      .catch((e) => console.debug('🚀 ~ SyntaxHighlighter ~ e:', e));
  }, [value, theme, lang]);

  return (
    <SyntaxHighlighterStyled>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </SyntaxHighlighterStyled>
  );
}

const shikiWrapper = async (value: string, editorTheme: string, lang: 'sql' | 'json'): Promise<string> => {
  return await codeToHtml(value, {
    lang,
    theme: editorTheme
  });
};
