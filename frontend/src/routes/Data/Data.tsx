import TestGrid from '@/components/common/DBDataGrid/TestGrid/TestGrid';
import { useMount } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, RowType } from '@/types';
import { Box } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import StatusBar from './StatusBar/StatusBar';

export default function Data(): JSX.Element {
  const selectedTab = useSelectedTab();
  const mounted = useMount();

  const { getColumns, isDataFetching, runQuery, getRows } = useDataStore();
  const { selectedTabId } = useTabStore();

  const [localRows, setLocalRows] = useState<RowType[]>([]);
  const [localColumns, setLocalColumns] = useState<ColumnType[]>([]);

  useEffect(() => {
    setLocalColumns([]);
    setLocalRows([]);

    if (!mounted) return;

    const columns = getColumns(true);
    const rows = getRows();

    if (!getRows() || !rows.length || !columns.length) {
      runQuery().then((res) => {
        if (res) {
          setLocalRows(res.data);
          setLocalColumns(res.columns);
        }
      });

      return;
    }

    setLocalColumns(columns);
    setLocalRows(rows);
  }, [mounted, selectedTabId]);

  if (!mounted) {
    return <></>;
  }

  return (
    <>
      <ActionBar />
      {selectedTab?.showFilters && <Filters />}
      {selectedTab?.showSorts && <Sorts />}
      {selectedTab?.showQuery && <QueryPreview />}
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {selectedTab?.showColumns && <Columns />}
        {localColumns.length > 0 && <TestGrid rows={localRows} columns={localColumns} loading={isDataFetching} />}
      </Box>
      <StatusBar />
    </>
  );
}
