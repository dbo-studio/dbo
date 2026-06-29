import type { Theme } from '@mui/material';
import { useMediaQuery } from '@mui/material';
import type { JSX } from 'react';
import type { QueryEditorActionBarProps } from '../types';
import {
  QueryEditorActionBarActionsBoxStyled,
  QueryEditorActionBarBoxStyled,
  QueryEditorActionBarStackStyled
} from './QueryEditorActionBar.styled';
import QueryEditorActions from './QueryEditorActions/QueryEditorActions';
import QueryEditorLeading from './QueryEditorLeading/QueryEditorLeading';

export default function QueryEditorActionBar({
  databases,
  schemas,
  onFormat,
  onRunQuery,
  onAiExplain,
  loading
}: QueryEditorActionBarProps): JSX.Element {
  const isCompact = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  return (
    <QueryEditorActionBarStackStyled direction={isCompact ? 'column' : 'row'} spacing={isCompact ? 1 : 0}>
      <QueryEditorActionBarBoxStyled isCompact={isCompact}>
        <QueryEditorLeading databases={databases} schemas={schemas} />
      </QueryEditorActionBarBoxStyled>
      <QueryEditorActionBarActionsBoxStyled isCompact={isCompact}>
        <QueryEditorActions
          loading={loading}
          onFormat={onFormat}
          onRunQuery={onRunQuery}
          onAiExplain={onAiExplain}
        />
      </QueryEditorActionBarActionsBoxStyled>
    </QueryEditorActionBarStackStyled>
  );
}
