import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { shortcuts, tools } from '@/core/utils';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import type { QueryEditorActionsProps } from '../../types';

export default function QueryEditorActions({ onFormat }: QueryEditorActionsProps): JSX.Element {
  const selectedTab = useSelectedTab();
  const queryClient = useQueryClient();
  const { runRawQuery } = useDataStore();
  const { updateQuery, getQuery } = useTabStore();
  const currentConnection = useCurrentConnection();

  const { mutateAsync: createSavedQueryMutation } = useMutation({
    mutationFn: api.savedQueries.createSavedQuery,
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['savedQueries', currentConnection?.id]
      });
      toast.success(locales.query_saved_successfully);
    },
    onError: (error: Error): void => {
      console.error('🚀 ~ createSavedQueryMutation ~ error:', error);
    }
  });

  const handleFormatSql = (): void => {
    if (selectedTab && checkQueryLength()) {
      updateQuery(tools.formatSql(getQuery(), 'postgresql'));
      onFormat();
    }
  };

  const handleMinifySql = (): void => {
    if (selectedTab && checkQueryLength()) {
      const minified = tools.minifySql(getQuery());
      updateQuery(minified);
      onFormat();
    }
  };

  const saveQuery = async (): Promise<void> => {
    if (!selectedTab || !checkQueryLength()) {
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
    return getQuery().length > 0;
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
