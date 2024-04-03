import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Button, Stack, useTheme } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { minify } from 'pgsql-minify';
import { format } from 'sql-formatter';

export default function QueryEditorActionBar() {
  const theme = useTheme();
  const { runRawQuery } = useDataStore();
  const { selectedTab, updateSelectedTab } = useTabStore();

  const handleFormatSql = () => {
    if (selectedTab && selectedTab.query.length > 0) {
      selectedTab.query = format(selectedTab.query, { language: 'postgresql' });
      updateSelectedTab(selectedTab);
    }
  };

  const handleMinifySql = () => {
    if (selectedTab && selectedTab.query.length > 0) {
      selectedTab.query = minify(selectedTab.query);
      updateSelectedTab(selectedTab);
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
        <Stack spacing={2} direction={'row'}>
          <Button variant='outlined' size='small' aria-label='grid' onClick={handleMinifySql}>
            {locales.minify}
          </Button>
          <Button variant='outlined' size='small' aria-label='grid' onClick={handleFormatSql}>
            {locales.beatify}
          </Button>
          <Button variant='contained' size='small' aria-label='grid' onClick={() => runRawQuery()}>
            {locales.run}
          </Button>
        </Stack>
      </Grid>
    </Stack>
  );
}
