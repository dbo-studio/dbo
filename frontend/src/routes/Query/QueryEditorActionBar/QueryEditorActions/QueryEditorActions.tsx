import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { shortcuts, tools } from '@/core/utils';
import { useShortcut } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useSavedQueryStore } from '@/store/savedQueryStore/savedQuery.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { SavedQueryType } from '@/types';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import type { QueryEditorActionsProps } from '../../types';

export default function QueryEditorActions({ onFormat }: QueryEditorActionsProps): JSX.Element {
  const { runRawQuery } = useDataStore();
  const { updateQuery, getQuery } = useTabStore();
  const { upsertQuery } = useSavedQueryStore();
  const selectedTab = useSelectedTab();

  const { mutateAsync: createSavedQueryMutation } = useMutation({
    mutationFn: api.savedQueries.createSavedQuery,
    onSuccess: (data: SavedQueryType): void => {
      upsertQuery(data);
      toast.success(locales.query_saved_successfully);
    },
    onError: (error: Error): void => {
      console.error('🚀 ~ createSavedQueryMutation ~ error:', error);
    }
  });

  useShortcut(shortcuts.runQuery, () => runRawQuery());

  const handleFormatSql = (): void => {
    if (checkQueryLength()) {
      updateQuery(tools.formatSql(getQuery(), 'postgresql'));
      onFormat();
    }
  };

  const handleMinifySql = (): void => {
    if (checkQueryLength()) {
      const minified = tools.minifySql(getQuery());
      updateQuery(minified);
      onFormat();
    }
  };

  const saveQuery = async (): Promise<void> => {
    if (!checkQueryLength()) {
      toast.error(locales.empty_query);
      return;
    }

    try {
      await createSavedQueryMutation({
        query: getQuery()
      });
    } catch (error) {}
  };

  const checkQueryLength = (): boolean => {
    return selectedTab !== undefined && getQuery().length > 0;
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
        <IconButton color='primary' onClick={(): Promise<void> => runRawQuery()}>
          <CustomIcon type='play' />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
