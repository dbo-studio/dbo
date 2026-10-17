import { type JSX, useMemo } from 'react';
import { diffLines } from '../../utils/lineDiff';
import { SqlDiffLineStyled, SqlDiffViewStyled } from './SqlDiffView.styled';

const SIGN = { add: '+', del: '-', same: ' ' } as const;

export default function SqlDiffView({ before, after }: { before: string; after: string }): JSX.Element {
  const lines = useMemo(() => diffLines(before, after), [before, after]);

  return (
    <SqlDiffViewStyled data-testid='ai-sql-diff'>
      {lines.map((line, index) => (
        // Lines can repeat (blank lines, identical clauses) and the list never reorders, so index is the stable key.
        // eslint-disable-next-line @eslint-react/no-array-index-key
        <SqlDiffLineStyled key={index} kind={line.kind} data-diff={line.kind}>
          <span className='diff-sign'>{SIGN[line.kind]}</span>
          <span>{line.text}</span>
        </SqlDiffLineStyled>
      ))}
    </SqlDiffViewStyled>
  );
}
