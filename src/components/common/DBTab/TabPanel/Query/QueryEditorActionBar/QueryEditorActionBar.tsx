import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { Button, Stack, useTheme } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';

export default function QueryEditorActionBar() {
  const theme = useTheme();
  const { runRawQuery } = useDataStore();

  const handleActions = (type: 'run') => {
    switch (type) {
      case 'run':
        runRawQuery();
        break;
    }
  };

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
      <Grid md={8} display='flex' justifyContent='flex-start'></Grid>
      <Grid md={8} mx={2} display='flex' justifyContent='flex-end'>
        <Button variant='contained' size='small' aria-label='grid' onClick={() => handleActions('run')}>
          {locales.run}
        </Button>
      </Grid>
    </Stack>
  );
}
