import { Grid2, Stack, useTheme } from '@mui/material';
import type { QueryEditorActionBarProps } from '../types';
import QueryEditorActions from './QueryEditorActions/QueryEditorActions';
import QueryEditorLeading from './QueryEditorLeading/QueryEditorLeading';

export default function QueryEditorActionBar({ onChange, onFormat }: QueryEditorActionBarProps) {
  const theme = useTheme();

  return (
    <Stack
      id='action-bar'
      borderBottom={`1px solid ${theme.palette.divider}`}
      borderTop={`1px solid ${theme.palette.divider}`}
      padding='8px'
      direction='row'
      justifyContent='space-between'
      alignItems='center'
    >
      <Grid2 size={{ md: 8 }} display='flex' justifyContent='flex-start'>
        <QueryEditorLeading onChange={onChange} />
      </Grid2>
      <Grid2 size={{ md: 8 }} display='flex' justifyContent='flex-end'>
        <QueryEditorActions onFormat={onFormat} />
      </Grid2>
    </Stack>
  );
}
