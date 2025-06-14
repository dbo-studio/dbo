import { Grid, Stack } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import type { QueryEditorActionBarProps } from '../types';
import QueryEditorActions from './QueryEditorActions/QueryEditorActions';
import QueryEditorLeading from './QueryEditorLeading/QueryEditorLeading';

export default function QueryEditorActionBar({
  databases,
  schemas,
  onFormat,
  onRunQuery
}: QueryEditorActionBarProps): JSX.Element {
  const [localDatabases, setLocalDatabases] = useState<string[]>([]);
  const [localSchemas, setLocalSchemas] = useState<string[]>([]);

  useEffect(() => {
    if (localDatabases.length === 0) {
      setLocalDatabases(databases);
    }

    if (localSchemas.length === 0) {
      setLocalSchemas(schemas);
    }
  }, [databases, schemas]);

  return (
    <Stack
      id='action-bar'
      borderBottom={(theme): string => `1px solid ${theme.palette.divider}`}
      borderTop={(theme): string => `1px solid ${theme.palette.divider}`}
      padding={1}
      direction='row'
      justifyContent='space-between'
      alignItems='center'
    >
      <Grid size={{ md: 8 }} display='flex' justifyContent='flex-start'>
        <QueryEditorLeading databases={localDatabases} schemas={localSchemas} />
      </Grid>
      <Grid size={{ md: 8 }} display='flex' justifyContent='flex-end'>
        <QueryEditorActions onFormat={onFormat} onRunQuery={onRunQuery} />
      </Grid>
    </Stack>
  );
}
