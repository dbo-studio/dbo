import locales from '@/locales';
import { type JSX } from 'react';
import { EmptyNoteStyled, LoadingRowStyled } from '../ObjectTreeView.styled';
import { TreeRowPosition } from '../TreeRow/TreeRow.styled';

type TreeLoadingRowProps = {
  level: number;
  top: number;
  empty?: boolean;
};

export default function TreeLoadingRow({ level, top, empty }: TreeLoadingRowProps): JSX.Element {
  return (
    <TreeRowPosition aria-hidden='true' top={top}>
      <LoadingRowStyled level={level}>
        {empty ? <EmptyNoteStyled>{locales.tree_empty_folder}</EmptyNoteStyled> : <span />}
      </LoadingRowStyled>
    </TreeRowPosition>
  );
}