import type { JSX, RefObject } from 'react';
import type { SqlEditorRef } from '@/components/base/SqlEditor/types';
import { SqlKeyBarStyled, SqlKeyStyled } from './SqlKeyBar.styled';

const KEYS = ['SELECT', 'FROM', 'WHERE', '*', ',', '(', ')', "'", '=', ';'];

/** Phone-only row of SQL tokens above the keyboard, so common keywords and punctuation need no keyboard switching. */
export default function SqlKeyBar({ editorRef }: { editorRef: RefObject<SqlEditorRef | null> }): JSX.Element {
  return (
    <SqlKeyBarStyled data-testid='sql-key-bar'>
      {KEYS.map((key) => (
        <SqlKeyStyled
          key={key}
          // Keeps focus (and the on-screen keyboard) in the editor instead of moving it to the button.
          onPointerDown={(event): void => event.preventDefault()}
          onClick={(): void => editorRef.current?.insertText(key.length > 1 ? `${key} ` : key)}
        >
          {key}
        </SqlKeyStyled>
      ))}
    </SqlKeyBarStyled>
  );
}
