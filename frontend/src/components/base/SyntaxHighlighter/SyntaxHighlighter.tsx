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
      .catch(() => undefined);
  }, [value, theme, lang]);

  return (
    <SyntaxHighlighterStyled data-select-all-root>
      {html ? (
        // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- Shiki renders trusted syntax HTML
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        // Plain text until the highlighter loads (or if it cannot), so the block never collapses to nothing.
        <pre>{value}</pre>
      )}
    </SyntaxHighlighterStyled>
  );
}
