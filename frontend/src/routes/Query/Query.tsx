import api from '@/api';
import ResizableYBox from '@/components/base/ResizableBox/ResizableYBox.tsx';
import SqlEditor from '@/components/base/SqlEditor/SqlEditor.tsx';
import DataGrid from '@/components/common/DataGrid/DataGrid';
import { shortcuts } from '@/core/utils';
import { useCurrentConnection, useShortcut, useWindowSize } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { AutoCompleteType, ColumnType, RowType } from '@/types';
import { Box, type Theme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import QueryEditorActionBar from './QueryEditorActionBar/QueryEditorActionBar';

export default function Query(): JSX.Element {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const windowSize = useWindowSize();
  const [tableData, setTableData] = useState({
    rows: [] as RowType[],
    columns: [] as ColumnType[]
  });

  const getQuery = useTabStore((state) => state.getQuery);
  const updateQuery = useTabStore((state) => state.updateQuery);
  const runRawQuery = useDataStore((state) => state.runRawQuery);
  const loadDataFromIndexedDB = useDataStore((state) => state.loadDataFromIndexedDB);
  const toggleDataFetching = useDataStore((state) => state.toggleDataFetching);

  const [value, setValue] = useState('');
  const [showGrid, setShowGrid] = useState(false);
  const isDataFetching = useDataStore((state) => state.isDataFetching);

  useShortcut(shortcuts.runQuery, () => runRawQuery());

  const { data: autocomplete } = useQuery({
    queryKey: ['autocomplete', currentConnection?.id, selectedTab?.options?.database, selectedTab?.options?.schema],
    queryFn: async (): Promise<AutoCompleteType> =>
      api.query.autoComplete({
        connectionId: currentConnection?.id ?? 0,
        fromCache: false,
        database: selectedTab?.options?.database === '' ? undefined : selectedTab?.options?.database,
        schema: selectedTab?.options?.schema === '' ? undefined : selectedTab?.options?.schema
      }),
    enabled: !!currentConnection
  });

  useEffect(() => {
    handleChangeValue();
    loadData();
  }, [selectedTab?.id, autocomplete]);

  const handleChangeValue = (): void => {
    setValue(getQuery());
  };

  const handleUpdateState = (query: string): void => {
    updateQuery(query);
  };

  const loadData = async (): Promise<void> => {
    setTableData({
      rows: [],
      columns: []
    });

    toggleDataFetching(true);
    try {
      const result = await loadDataFromIndexedDB();
      if (result) {
        setTableData(result);
      }
    } catch (error) {
      console.error('🚀 ~ loadData ~ error:', error);
    }

    toggleDataFetching(false);
  };

  const runQuery = async (query?: string): Promise<void> => {
    const res = await runRawQuery(query);
    setTableData({
      rows: res?.data ?? [],
      columns: res?.columns.filter((column) => column.isActive) ?? []
    });
  };

  return (
    <>
      <QueryEditorActionBar
        loading={isDataFetching}
        onRunQuery={runQuery}
        databases={autocomplete?.databases ?? []}
        schemas={autocomplete?.schemas ?? []}
        onFormat={(): void => handleChangeValue()}
      />
      <Box display={'flex'} flexDirection={'column'} height={windowSize.height}>
        <Box
          display={'flex'}
          minHeight={'0'}
          flex={1}
          borderBottom={(theme: Theme): string => `1px solid ${theme.palette.divider}`}
        >
          <SqlEditor
            onRunQuery={runQuery}
            onMount={(): void => setShowGrid(true)}
            onChange={handleUpdateState}
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
        </Box>

        {showGrid && tableData.columns.length > 0 && (
          <ResizableYBox height={windowSize.heightNumber ? windowSize.heightNumber / 2 : 0} direction={'btt'}>
            <DataGrid editable={false} rows={tableData.rows} columns={tableData.columns} loading={isDataFetching} />
          </ResizableYBox>
        )}
      </Box>
    </>
  );
}
