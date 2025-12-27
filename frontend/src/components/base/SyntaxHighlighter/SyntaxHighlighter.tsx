import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useEffect, useState } from 'react';
import { codeToHtml } from 'shiki/bundle/web';
import { SyntaxHighlighterStyled } from './SyntaxHighlighter.styled';
import type { SyntaxHighlighterProps } from './types';

export default function SyntaxHighlighter({ value }: SyntaxHighlighterProps): JSX.Element {
  const [html, setHtml] = useState('');
  const theme = useSettingStore((state) => state.theme.editorTheme);

  useEffect(() => {
    shikiWrapper(value, theme).then((_html) => setHtml(_html));
  }, [value, theme]);

  return (
    <SyntaxHighlighterStyled>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </SyntaxHighlighterStyled>
  );
}

const shikiWrapper = async (value: string, editorTheme: string): Promise<string> => {
  return await codeToHtml(value, {
    lang: 'sql',
    theme: editorTheme
  });
};
