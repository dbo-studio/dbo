import { highlightCode } from '@/core/syntax/highlightCode';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { type JSX, useEffect, useState } from 'react';
import { SyntaxHighlighterStyled } from './SyntaxHighlighter.styled';
import type { SyntaxHighlighterProps } from './types';

export default function SyntaxHighlighter({ value, lang = 'sql' }: SyntaxHighlighterProps): JSX.Element {
  const [html, setHtml] = useState('');
  const theme = useSettingStore((state) => state.theme.editorTheme);

  useEffect(() => {
    highlightCode(value, lang, theme)
      .then((_html) => setHtml(_html))
      .catch((e) => console.debug('🚀 ~ SyntaxHighlighter ~ e:', e));
  }, [value, theme, lang]);

  return (
    <SyntaxHighlighterStyled>
      {/* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- Shiki renders trusted syntax HTML */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </SyntaxHighlighterStyled>
  );
}
