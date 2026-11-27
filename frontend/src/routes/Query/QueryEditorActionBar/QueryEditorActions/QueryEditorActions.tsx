import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { ExportModal } from '@/components/common/ExportModal/ExportModal';
import { shortcuts, tools } from '@/core/utils';
import { useCurrentConnection, useFeaturePermissions, useShortcut } from '@/hooks';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useTabTransaction } from '@/hooks/useTabTransaction';
import { Box, Button, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import type { IconProps } from '@/components/base/CustomIcon/types';
import type { QueryEditorActionsProps } from '../../types';

export default function QueryEditorActions({
  collapsed = false,
  onFormat,
  onRunQuery,
  onAiExplain,
  loading,
  formatQuery,
  onExport,
  onStop
}: QueryEditorActionsProps): JSX.Element {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const queryClient = useQueryClient();
  const perms = useFeaturePermissions();
  const { isMobile } = useLayoutMode();
  const [showExport, setShowExport] = useState({
    show: false,
    connectionId: 0,
    query: '',
    table: ''
  });

  const updateQuery = useTabStore((state) => state.updateQuery);
  const getQuery = useTabStore((state) => state.getQuery);
  const currentConnection = useCurrentConnection();
  const cancelRunningQuery = useDataStore((state) => state.cancelRunningQuery);
  const transaction = useTabTransaction();

  const { mutateAsync: createSavedQueryMutation } = useMutation({
    mutationFn: api.savedQueries.createSavedQuery
  });

  const handleFormatSql = (): void => {
    if (formatQuery) {
      formatQuery();
      return;
    }
    updateQuery(tools.formatSql(getQuery(), 'postgresql'));
    onFormat();
  };

  useShortcut(shortcuts.formatSql, handleFormatSql);

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
    } catch {
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

  const handleRunOrStop = (): void => {
    if (loading) {
      (onStop ?? cancelRunningQuery)();
      return;
    }
    onRunQuery();
  };

  type Action = {
    key: string;
    label: string;
    tooltip?: string;
    icon: IconProps['type'];
    testId?: string;
    onClick: (anchor: HTMLElement) => void;
  };
  const actions: Action[] = [
    { key: 'save', label: locales.save, icon: 'save', onClick: () => void saveQuery() },
    ...(perms.export || onExport
      ? [
          {
            key: 'export',
            label: locales.export,
            icon: 'export' as const,
            onClick: (anchor: HTMLElement) => (onExport ? onExport(anchor) : handleExport())
          }
        ]
      : []),
    ...(!formatQuery
      ? [{ key: 'minify', label: locales.minify, icon: 'pickaxe' as const, onClick: handleMinifySql }]
      : []),
    {
      key: 'format',
      label: locales.beatify,
      tooltip: `${locales.beatify} (${shortcuts.formatSql.command.join('+')})`,
      icon: 'wand_sparkles',
      onClick: handleFormatSql
    },
    { key: 'ai', label: locales.ai_explain, icon: 'sparkles', onClick: onAiExplain },
    // While a transaction is open, commit/rollback stay visible below instead.
    ...(!formatQuery && !transaction.active
      ? [
          {
            key: 'transaction',
            label: locales.start_transaction,
            tooltip: locales.transaction_begin,
            icon: 'databaseZap' as const,
            testId: 'transaction-begin',
            onClick: () => void transaction.begin()
          }
        ]
      : [])
  ];

  const transactionButtons =
    !formatQuery && transaction.active ? (
      <>
        <Tooltip title={locales.transaction_active}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CustomIcon type='databaseZap' color='currentColor' />
          </Box>
        </Tooltip>
        <Button color='success' data-testid='transaction-commit' onClick={() => void transaction.end(true)}>
          {locales.transaction_commit}
        </Button>
        <Button color='error' data-testid='transaction-rollback' onClick={() => void transaction.end(false)}>
          {locales.transaction_rollback}
        </Button>
      </>
    ) : null;

  const actionButtons = collapsed ? (
    <>
      <Tooltip title={locales.more_actions}>
        <IconButton
          aria-label={locales.more_actions}
          data-testid='editor-more-actions'
          color='default'
          onClick={(e): void => setMenuAnchor(e.currentTarget)}
        >
          <CustomIcon type='ellipsisVertical' />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {actions.map((action) => (
          <MenuItem
            key={action.key}
            data-testid={action.testId}
            onClick={(): void => {
              // Keep the three-dot button as anchor: the menu item unmounts on close.
              const anchor = menuAnchor as HTMLElement;
              setMenuAnchor(null);
              action.onClick(anchor);
            }}
          >
            <ListItemIcon>
              <CustomIcon type={action.icon} />
            </ListItemIcon>
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  ) : (
    actions.map((action) => (
      <Tooltip key={action.key} title={action.tooltip ?? action.label}>
        <IconButton
          aria-label={action.label}
          data-testid={action.testId}
          color='default'
          onClick={(e): void => action.onClick(e.currentTarget)}
        >
          <CustomIcon type={action.icon} />
        </IconButton>
      </Tooltip>
    ))
  );

  return (
    <Stack direction={'row'} sx={{ flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
      {actionButtons}
      {transactionButtons}
      <Box
        sx={{
          padding: '3px !important'
        }}
      >
        <Tooltip
          title={
            loading
              ? `${locales.stop_query} (${shortcuts.cancelQuery.command.join('+')})`
              : shortcuts.runQuery.command.join('+')
          }
        >
          {isMobile ? (
            <IconButton
              aria-label={loading ? locales.stop_query : locales.run_query}
              data-testid={loading ? 'stop-query' : 'run-query'}
              color={loading ? 'error' : 'primary'}
              onClick={handleRunOrStop}
            >
              <CustomIcon type={loading ? 'stop' : 'play'} />
            </IconButton>
          ) : (
            <Button
              variant='contained'
              color={loading ? 'error' : 'primary'}
              aria-label={loading ? locales.stop_query : locales.run_query}
              data-testid={loading ? 'stop-query' : 'run-query'}
              startIcon={<CustomIcon type={loading ? 'stop' : 'play'} size='s' color='currentColor' />}
              onClick={handleRunOrStop}
            >
              {loading ? locales.stop : locales.run}
            </Button>
          )}
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
