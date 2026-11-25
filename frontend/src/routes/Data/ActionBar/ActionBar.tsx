import api from '@/api';
import type { RunQueryResponseType } from '@/api/query/types';
import { parseObjectNodeId } from '@/core/db/parseObjectNodeId';
import { getConnectionAlias } from '@/core/db/connectionAliases';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { toast } from 'sonner';
import SqlExplainDialog from './SqlExplainDialog/SqlExplainDialog';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import BrowseActionBar from '@/components/common/BrowseActionBar/BrowseActionBar';
import BrowsePanelButton from '@/components/common/BrowseActionBar/BrowsePanelButton/BrowsePanelButton';
import { ExportModal } from '@/components/common/ExportModal/ExportModal';
import { ImportModal } from '@/components/common/ImportModal/ImportModal';
import { useSelectedTab, useFeaturePermissions } from '@/hooks';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { DataTabType } from '@/types';
import { Badge, Box, IconButton, Tooltip } from '@mui/material';
import { type JSX, useState } from 'react';
import Filters from '@/components/common/Filters/Filters';
import InlineQuery from './InlineQuery/InlineQuery';
import QueryPreview from '@/components/common/QueryPreview/QueryPreview';
import Sorts from '@/components/common/Sorts/Sorts';
import type { ActionBarProps } from './types';

export default function ActionBar({ showColumns, setShowColumns }: ActionBarProps): JSX.Element {
  const driver = getConnectionAlias(useCurrentConnection()?.type)?.driver;
  const canExplain =
    driver === 'postgresql' ||
    driver === 'mysql' ||
    driver === 'sqlite' ||
    driver === 'clickhouse' ||
    driver === 'sqlserver';
  const [plan, setPlan] = useState<RunQueryResponseType>();
  const [explaining, setExplaining] = useState(false);
  const selectedTab = useSelectedTab<DataTabType>();
  const getQuery = useTabStore((state) => state.getQuery);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const columns = useDataStore((state) => state.columns);

  const sortCount = selectedTab?.sorts?.filter((sort) => sort.isActive).length ?? 0;
  const filterCount = selectedTab?.filters?.filter((filter) => filter.isActive).length ?? 0;
  const hiddenColumnCount = columns?.filter((column) => !column.isActive).length ?? 0;

  const showFilters = selectedTab?.showFilters ?? false;
  const showSorts = selectedTab?.showSorts ?? false;
  const showQuery = selectedTab?.showQuery ?? false;

  const perms = useFeaturePermissions();
  const [showExport, setShowExport] = useState({
    show: false,
    connectionId: 0,
    query: '',
    table: ''
  });
  const [showImport, setShowImport] = useState({
    show: false,
    connectionId: 0,
    table: ''
  });

  const handleShowExport = () => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    const table = useTabStore.getState().selectedTab<DataTabType>()?.table ?? 'exported_table';
    const query = useTabStore.getState().getQuery() ?? '';

    setShowExport({
      show: true,
      connectionId: currentConnectionId as number,
      query: query,
      table: table
    });
  };

  const handleShowImport = () => {
    const currentConnectionId = useConnectionStore.getState().currentConnectionId;
    const table = useTabStore.getState().selectedTab<DataTabType>()?.table ?? 'exported_table';

    setShowImport({
      show: true,
      connectionId: currentConnectionId as number,
      table: table
    });
  };

  const explain = async (): Promise<void> => {
    const query = getQuery();
    const connectionId = Number(selectedTab?.connectionId);
    if (!query || !connectionId || !selectedTab || explaining) return;
    const { database, schema } = parseObjectNodeId(selectedTab.nodeId);
    setExplaining(true);
    try {
      const result = await withSafeModeRetry(
        (confirmed) =>
          api.query.explainQuery({
            connectionId,
            query,
            database: driver === 'sqlserver' ? undefined : database,
            schema,
            confirmed
          }),
        connectionId
      );
      if (result) setPlan(result);
    } catch {
      toast.error(locales.action_failed);
    } finally {
      setExplaining(false);
    }
  };

  const handleToggle = (type: 'filter' | 'query' | 'sort' | 'column'): void => {
    if (!selectedTab) return;

    switch (type) {
      case 'filter':
        updateSelectedTab({
          ...selectedTab,
          showFilters: !showFilters,
          showSorts: false,
          showQuery: false
        });
        break;
      case 'query':
        updateSelectedTab({
          ...selectedTab,
          showFilters: false,
          showSorts: false,
          showQuery: !showQuery
        });
        break;
      case 'sort':
        updateSelectedTab({
          ...selectedTab,
          showFilters: false,
          showSorts: !showSorts,
          showQuery: false
        });
        break;
      case 'column':
        setShowColumns(!showColumns);
        break;
    }
  };

  return (
    <Box>
      <BrowseActionBar input={<InlineQuery />}>
        <BrowsePanelButton
          kind='filter'
          open={showFilters}
          count={filterCount}
          onClick={() => handleToggle('filter')}
        />
        <BrowsePanelButton kind='sort' open={showSorts} count={sortCount} onClick={() => handleToggle('sort')} />
        <Tooltip title={locales.columns}>
          <IconButton
            className={showColumns ? 'active' : ''}
            aria-label='grid'
            onClick={(): void => handleToggle('column')}
          >
            <Badge badgeContent={hiddenColumnCount} color='secondary' variant='dot'>
              <CustomIcon type='grid' size='s' />
            </Badge>
          </IconButton>
        </Tooltip>

        {perms.export && (
          <Tooltip title={locales.export}>
            <IconButton data-testid='export-button' aria-label='export' onClick={handleShowExport}>
              <CustomIcon type='export' size='s' />
            </IconButton>
          </Tooltip>
        )}

        {perms.import && (
          <Tooltip title={locales.import}>
            <IconButton data-testid='import-button' aria-label='import' onClick={handleShowImport}>
              <CustomIcon type='import' size='s' />
            </IconButton>
          </Tooltip>
        )}

        {canExplain && (
          <Tooltip title={locales.nosql_explain}>
            <span>
              <IconButton aria-label={locales.nosql_explain} disabled={explaining} onClick={() => void explain()}>
                <CustomIcon type='search' size='s' />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title={locales.query_preview}>
          <IconButton
            aria-label={locales.query_preview}
            className={showQuery ? 'active' : 'toggle-code-preview'}
            onClick={(): void => handleToggle('query')}
          >
            <CustomIcon type='code' size='s' />
          </IconButton>
        </Tooltip>
      </BrowseActionBar>

      <ExportModal
        onClose={() => setShowExport({ ...showExport, show: false })}
        show={showExport.show}
        connectionId={showExport.connectionId}
        query={showExport.query}
        table={showExport.table}
      />
      <ImportModal
        onClose={() => setShowImport({ ...showImport, show: false })}
        show={showImport.show}
        connectionId={showImport.connectionId}
        table={showImport.table}
      />

      {plan && <SqlExplainDialog plan={plan} onClose={() => setPlan(undefined)} />}
      {showFilters && <Filters />}
      {showSorts && <Sorts />}
      {showQuery && <QueryPreview query={getQuery()} />}
    </Box>
  );
}
