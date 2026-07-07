import api from '@/api';
import type { RunQueryResponseType } from '@/api/query/types';
import ResizableYBox from '@/components/base/ResizableBox/ResizableYBox.tsx';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor.tsx';
import { SqlEditorRef } from '@/components/base/SqlEditor/types';
import QueryResultGrid from './QueryResultGrid/QueryResultGrid';
import { shortcuts } from '@/core/utils';
import { useCurrentConnection, useLayoutMode, useShortcut, useWindowSize } from '@/hooks';
import { useAiBridge } from '@/hooks/useAiBridge';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AutoCompleteType, ColumnType, EditorTabType, RowType } from '@/types';
import { Tab, Tabs } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX, SyntheticEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { QueryContainerStyled, QueryEditorBoxStyled } from './Query.styled';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';
import QueryErrorBanner from './QueryErrorBanner/QueryErrorBanner';

type QueryMobileView = 'editor' | 'results';

const EMPTY_ROWS: RowType[] = [];
const EMPTY_COLUMNS: ColumnType[] = [];

const getActiveColumns = (columns: ColumnType[] | undefined): ColumnType[] =>
  columns?.filter((column) => column.isActive !== false) ?? [];

export default function Query(): JSX.Element {
  const selectedTab = useSelectedTab<EditorTabType>();
  const currentConnection = useCurrentConnection();
  const windowSize = useWindowSize();
  const { isMobile } = useLayoutMode();
  const sqlEditorRef = useRef<SqlEditorRef>(null);

  const [tableData, setTableData] = useState<{ rows: RowType[]; columns: ColumnType[] }>({
    rows: EMPTY_ROWS,
    columns: EMPTY_COLUMNS
  });

  const getQuery = useTabStore((state) => state.getQuery);
  const updateQuery = useTabStore((state) => state.updateQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);
  const loadDataFromIndexedDB = useDataStore((state) => state.loadDataFromIndexedDB);
  const pendingEditorQueryRun = useDataStore((state) => state.pendingEditorQueryRun);
  const clearPendingEditorQueryRun = useDataStore((state) => state.clearPendingEditorQueryRun);

  const [value, setValue] = useState('');
  const [mobileView, setMobileView] = useState<QueryMobileView>('editor');
  const [prevTabId, setPrevTabId] = useState(selectedTab?.id);

  if (selectedTab?.id !== prevTabId) {
    setPrevTabId(selectedTab?.id);
    setValue(getQuery(selectedTab?.id));
    setMobileView('editor');
    setTableData({ rows: EMPTY_ROWS, columns: EMPTY_COLUMNS });
  }

  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const lastQueryError = useDataStore((state) => state.lastQueryError);
  const { askAboutSelection } = useAiBridge();

  useShortcut(shortcuts.runQuery, () => void runQuery());

  const { data: autocomplete } = useQuery({
    queryKey: ['autocomplete', currentConnection?.id, selectedTab?.database, selectedTab?.schema],
    queryFn: async (): Promise<AutoCompleteType> =>
      api.query.autoComplete({
        connectionId: currentConnection?.id ?? 0,
        database: selectedTab?.database === '' ? undefined : selectedTab?.database,
        schema: selectedTab?.schema === '' ? undefined : selectedTab?.schema
      }),
    enabled: !!currentConnection
  });

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const result = await loadDataFromIndexedDB();
      if (result) {
        setTableData({
          rows: result.rows,
          columns: result.columns
        });
      }
    } catch (error) {
      console.debug('🚀 ~ loadData ~ error:', error);
    }
  }, [loadDataFromIndexedDB]);

  useEffect(() => {
    if (!selectedTab?.id) {
      return;
    }

    setValue(getQuery(selectedTab.id));
  }, [selectedTab?.id, getQuery]);

  useEffect(() => {
    if (!selectedTab?.id) {
      return;
    }

    const pending = useDataStore.getState().pendingEditorQueryRun;
    if (pending?.tabId === selectedTab.id) {
      return;
    }

    void loadData().catch((e) => console.log('🚀 ~ Query ~ e:', e));
  }, [selectedTab?.id, loadData]);

  const applyQueryResult = useCallback(
    (res: RunQueryResponseType | undefined): void => {
      const columns = getActiveColumns(res?.columns);
      setTableData({
        rows: res?.data ?? EMPTY_ROWS,
        columns
      });

      if (columns.length > 0 && isMobile) {
        setMobileView('results');
      }
    },
    [isMobile]
  );

  const executeRawQuery = useCallback(
    async (sql?: string): Promise<RunQueryResponseType | undefined> => {
      const res = await runRawQuery(sql);
      applyQueryResult(res);
      return res;
    },
    [applyQueryResult, runRawQuery]
  );

  useEffect(() => {
    if (!pendingEditorQueryRun || pendingEditorQueryRun.tabId !== selectedTab?.id) {
      return;
    }

    const { query } = pendingEditorQueryRun;
    clearPendingEditorQueryRun();

    const runPending = async (): Promise<void> => {
      setValue(query);
      updateQuery(query);
      const res = await executeRawQuery(query);
      if (res) {
        toast.success(locales.run_query);
      }
    };

    void runPending();
  }, [pendingEditorQueryRun, selectedTab?.id, clearPendingEditorQueryRun, executeRawQuery, updateQuery]);

  const handleUpdateState = (query: string): void => {
    setValue(query);
    updateQuery(query);
  };

  const runQuery = async (): Promise<void> => {
    const selectedQuery = sqlEditorRef.current?.getSelectedQuery();
    await executeRawQuery(selectedQuery === '' ? undefined : selectedQuery);
  };

  const handleAiExplain = (): void => {
    const sql = sqlEditorRef.current?.getSelectedQuery()?.trim();
    if (!sql) {
      return;
    }
    askAboutSelection(sql, 'explain');
  };

  const handleMobileViewChange = (_: SyntheticEvent, nextView: QueryMobileView): void => {
    setMobileView(nextView);
  };

  const displayRows = tableData.rows;
  const displayColumns = useMemo(() => getActiveColumns(tableData.columns), [tableData.columns]);

  const hasResults = displayColumns.length > 0;
  const showMobileTabs = isMobile && hasResults;
  const resultsPanelHeight = Math.max(Math.floor((windowSize.heightNumber ?? 600) / 2), 200);

  return (
    <>
      <QueryEditorActionBar
        loading={isDataFetching}
        onRunQuery={() => void runQuery()}
        onAiExplain={handleAiExplain}
        databases={autocomplete?.databases ?? []}
        schemas={autocomplete?.schemas ?? []}
        onFormat={(): void => setValue(getQuery())}
      />
      <QueryErrorBanner />
      {showMobileTabs && (
        <Tabs value={mobileView} onChange={handleMobileViewChange} variant='fullWidth'>
          <Tab value='editor' label={locales.query_editor} />
          <Tab value='results' label={locales.query_results} />
        </Tabs>
      )}
      <QueryContainerStyled height={isMobile ? '100%' : windowSize.height}>
        {(!isMobile || mobileView === 'editor') && (
          <QueryEditorBoxStyled>
            <SqlEditor
              ref={sqlEditorRef}
              onRunQuery={() => void runQuery()}
              onChange={handleUpdateState}
              onAiSelection={(sql, action) => askAboutSelection(sql, action)}
              hasQueryError={!!lastQueryError}
              autocomplete={
                autocomplete ?? {
                  databases: [],
                  schemas: [],
                  tables: [],
                  columns: {},
                  views: []
                }
              }
              value={value}
            />
          </QueryEditorBoxStyled>
        )}

        {hasResults &&
          (isMobile ? (
            mobileView === 'results' && (
              <QueryResultGrid loading={isDataFetching} rows={displayRows} columns={displayColumns} />
            )
          ) : (
            <ResizableYBox height={resultsPanelHeight} direction={'btt'}>
              <QueryResultGrid loading={isDataFetching} rows={displayRows} columns={displayColumns} />
            </ResizableYBox>
          ))}
      </QueryContainerStyled>
    </>
  );
}
