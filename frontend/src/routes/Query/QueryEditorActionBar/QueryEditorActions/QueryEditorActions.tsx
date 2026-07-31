import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { ExportModal } from '@/components/common/ExportModal/ExportModal';
import { shortcuts, tools } from '@/core/utils';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import type { QueryEditorActionsProps } from '../../types';

export default function QueryEditorActions({
  onFormat,
  onRunQuery,
  onAiExplain,
  loading
}: QueryEditorActionsProps): JSX.Element {
  const queryClient = useQueryClient();
  const [showExport, setShowExport] = useState({
    show: false,
    connectionId: 0,
    query: '',
    table: ''
  });

  const updateQuery = useTabStore((state) => state.updateQuery);
  const getQuery = useTabStore((state) => state.getQuery);
  const currentConnection = useCurrentConnection();

  const { mutateAsync: createSavedQueryMutation } = useMutation({
    mutationFn: api.savedQueries.createSavedQuery
  });

  const handleFormatSql = (): void => {
    updateQuery(tools.formatSql(getQuery(), 'postgresql'));
    onFormat();
  };

  const handleMinifySql = (): void => {
    const minified = tools.minifySql(getQuery());
    updateQuery(minified);
    onFormat();
  };

  const saveQuery = async (): Promise<void> => {
    if (!checkQueryLength()) {
      toast.error(locales.empty_query);
      return;
    }

    try {
      await createSavedQueryMutation({
        connectionId: currentConnection?.id ?? 0,
        query: getQuery()
      });

      await queryClient.invalidateQueries({
        queryKey: ['savedQueries', currentConnection?.id]
      });

      toast.success(locales.query_saved_successfully);
    } catch (error) {
      console.debug('🚀 ~ saveQuery ~ error:', error);
      toast.error(locales.save_failed);
    }
  };

  const checkQueryLength = (): boolean => {
    return getQuery().length > 0;
  };

  const handleExport = (): void => {
    setShowExport({
      show: true,
      connectionId: currentConnection?.id ?? 0,
      query: getQuery(),
      table: 'exported_table'
    });
  };

  return (
    <Stack spacing={2} direction={'row'}>
      <Tooltip title={locales.save}>
        <IconButton aria-label={locales.save} color='default' onClick={() => void saveQuery()}>
          <CustomIcon type='save' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.export}>
        <IconButton aria-label={locales.export} color='default' onClick={handleExport}>
          <CustomIcon type='export' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.minify}>
        <IconButton aria-label={locales.minify} color='default' onClick={handleMinifySql}>
          <CustomIcon type='pickaxe' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.beatify}>
        <IconButton aria-label={locales.beatify} color='default' onClick={handleFormatSql}>
          <CustomIcon type='wand_sparkles' />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.ai_explain}>
        <IconButton aria-label={locales.ai_explain} color='default' onClick={onAiExplain}>
          <CustomIcon type='sparkles' />
        </IconButton>
      </Tooltip>
      <Box
        sx={{
          padding: '3px !important'
        }}
      >
        <Tooltip title={shortcuts.runQuery.command.join('+')}>
          <IconButton
            aria-label={locales.run_query}
            disabled={loading}
            loading={loading}
            color='primary'
            onClick={(): void => onRunQuery()}
          >
            <CustomIcon type='play' />
          </IconButton>
        </Tooltip>
      </Box>

      <ExportModal
        onClose={() => setShowExport({ ...showExport, show: false })}
        show={showExport.show}
        connectionId={showExport.connectionId}
        query={showExport.query}
        table={showExport.table}
      />
    </Stack>
  );
}
