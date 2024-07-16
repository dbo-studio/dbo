import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { shortcuts } from '@/core/utils';
import { useShortcut } from '@/hooks';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSavedQueryStore } from '@/store/savedQueryStore/savedQuery.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { minify } from 'pgsql-minify';
import { toast } from 'sonner';
import { format } from 'sql-formatter';

export default function QueryEditorActions() {
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
    <Stack spacing={2} direction={'row'}>
      <Tooltip title={locales.save}>
        <IconButton color='default' onClick={saveQuery}>
          <CustomIcon type='save' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.minify}>
        <IconButton color='default' onClick={handleMinifySql}>
          <CustomIcon type='pickaxe' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.beatify}>
        <IconButton color='default' onClick={handleFormatSql}>
          <CustomIcon type='wand_sparkles' />
        </IconButton>
      </Tooltip>
      <Tooltip title={shortcuts.runQuery.command}>
        <IconButton color='primary' onClick={() => runRawQuery()}>
          <CustomIcon type='play' />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
