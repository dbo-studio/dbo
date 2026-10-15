import type { SqlEditorRef } from '@/components/base/SqlEditor/types';
import type { JSX, RefObject } from 'react';
import { SqlKeyBarStyled, SqlKeyDividerStyled, SqlKeyStyled } from './SqlKeyBar.styled';

const KEYWORDS = ['SELECT', 'FROM', 'WHERE'];
const SYMBOLS = ['*', ',', '(', ')', "'", '=', ';'];

/** Phone-only row of SQL tokens above the keyboard, so common keywords and punctuation need no keyboard switching. */
export default function SqlKeyBar({ editorRef }: { editorRef: RefObject<SqlEditorRef | null> }): JSX.Element {
  const renderKey = (token: string, keyword: boolean): JSX.Element => (
    <SqlKeyStyled
      key={token}
      keyword={keyword}
      // Keeps focus (and the on-screen keyboard) in the editor instead of moving it to the button.
      onPointerDown={(event): void => event.preventDefault()}
      onClick={(): void => editorRef.current?.insertText(keyword ? `${token} ` : token)}
    >
      {token}
    </SqlKeyStyled>
  );

  return (
    <SqlKeyBarStyled data-testid='sql-key-bar'>
      {KEYWORDS.map((token) => renderKey(token, true))}
      <SqlKeyDividerStyled />
      {SYMBOLS.map((token) => renderKey(token, false))}
    </SqlKeyBarStyled>
  );
}
