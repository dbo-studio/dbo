import { Stack, useTheme } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
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
      <Grid md={8} display='flex' justifyContent='flex-start'>
        <QueryEditorLeading onChange={onChange} />
      </Grid>
      <Grid md={8} mx={2} display='flex' justifyContent='flex-end'>
        <QueryEditorActions onFormat={onFormat} />
      </Grid>
    </Stack>
  );
}
