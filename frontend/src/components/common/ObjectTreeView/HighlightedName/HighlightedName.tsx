import { NodeMatch } from '../ObjectTreeView.styled';
import { type JSX } from 'react';

type HighlightedNameProps = {
  name: string;
  term: string;
};

export default function HighlightedName({ name, term }: HighlightedNameProps): JSX.Element {
  const start = term ? name.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (start < 0) return <>{name}</>;

  return (
    <>
      {name.slice(0, start)}
      <NodeMatch>{name.slice(start, start + term.length)}</NodeMatch>
      {name.slice(start + term.length)}
    </>
  );
}