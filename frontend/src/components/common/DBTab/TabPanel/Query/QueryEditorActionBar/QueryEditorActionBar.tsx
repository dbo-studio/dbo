import { shortcuts } from '@/core/utils';
import { useShortcut } from '@/hooks/useShortcut';
import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import locales from '@/src/locales';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useSavedQueryStore } from '@/src/store/savedQueryStore/savedQuery.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Button, Stack, Tooltip, useTheme } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { minify } from 'pgsql-minify';
import { toast } from 'sonner';
import { format } from 'sql-formatter';

export default function QueryEditorActionBar() {
  const theme = useTheme();
  const { runRawQuery } = useDataStore();
  const { selectedTab, updateSelectedTab } = useTabStore();
  const { upsertQuery } = useSavedQueryStore();

  const { request: createSavedQuery } = useAPI({
    apiMethod: api.savedQueries.createSavedQuery
  });

  useShortcut(shortcuts.runQuery, () => runRawQuery());

  const handleFormatSql = () => {
    if (selectedTab && selectedTab.query.length > 0) {
      selectedTab.query = format(selectedTab.query, { language: 'postgresql' });
      updateSelectedTab(selectedTab);
    }
  };

  const handleMinifySql = () => {
    if (checkQueryLength()) {
      selectedTab!.query = minify(selectedTab!.query);
      updateSelectedTab(selectedTab);
    }
  };

  const saveQuery = async () => {
    if (!checkQueryLength()) {
      toast.error(locales.empty_query);
      return;
    }

    try {
      const res = await createSavedQuery({
        query: selectedTab!.query
      });
      upsertQuery(res);
      toast.success(locales.query_saved_successfully);
    } catch (error) {
      console.log('🚀 ~ saveQuery ~ error:', error);
    }
  };

  const checkQueryLength = () => {
    return selectedTab && selectedTab.query.length > 0;
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
      <Grid md={8} display='flex' justifyContent='flex-start'>
        <Button color='secondary' variant='contained' size='small' aria-label='grid' onClick={saveQuery}>
          {locales.save}
        </Button>
      </Grid>
      <Grid md={8} mx={2} display='flex' justifyContent='flex-end'>
        <Stack spacing={2} direction={'row'}>
          <Button variant='outlined' size='small' aria-label='grid' onClick={handleMinifySql}>
            {locales.minify}
          </Button>
          <Button variant='outlined' size='small' aria-label='grid' onClick={handleFormatSql}>
            {locales.beatify}
          </Button>
          <Tooltip title={shortcuts.runQuery.command}>
            <Button variant='contained' size='small' aria-label='grid' onClick={() => runRawQuery()}>
              {locales.run}
            </Button>
          </Tooltip>
        </Stack>
      </Grid>
    </Stack>
  );
}
