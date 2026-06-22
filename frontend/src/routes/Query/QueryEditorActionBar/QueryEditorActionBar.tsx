import type { Theme } from '@mui/material';
import { Grid, useMediaQuery } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import type { QueryEditorActionBarProps } from '../types';
import QueryEditorActions from './QueryEditorActions/QueryEditorActions';
import QueryEditorLeading from './QueryEditorLeading/QueryEditorLeading';
import { QueryEditorActionBarStackStyled } from './QueryEditorActionBar.styled';

export default function QueryEditorActionBar({
  databases,
  schemas,
  onFormat,
  onRunQuery,
  loading
}: QueryEditorActionBarProps): JSX.Element {
  const [localDatabases, setLocalDatabases] = useState<string[]>([]);
  const [localSchemas, setLocalSchemas] = useState<string[]>([]);
  const matches = useMediaQuery((theme: Theme) => theme.breakpoints.up('sm'));

  useEffect(() => {
    if (localDatabases.length === 0) {
      setLocalDatabases(databases);
    }

    if (localSchemas.length === 0) {
      setLocalSchemas(schemas);
    }
  }, [databases, schemas]);

  return (
    <QueryEditorActionBarStackStyled direction='row'>
      <Grid
        size={{ md: 8 }}
        sx={{
          display: 'flex',
          justifyContent: 'flex-start'
        }}
      >
        <QueryEditorLeading databases={localDatabases} schemas={localSchemas} />
      </Grid>
      <Grid
        size={{ md: 8 }}
        sx={{
          display: matches ? 'flex' : 'none',
          justifyContent: 'flex-end'
        }}
      >
        <QueryEditorActions loading={loading} onFormat={onFormat} onRunQuery={onRunQuery} />
      </Grid>
    </QueryEditorActionBarStackStyled>
  );
}
