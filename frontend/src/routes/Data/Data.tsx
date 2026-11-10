import DataGrid from '@/components/common/DataGrid/DataGrid';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import { useDataTabLoader, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import BackgroundQueryNotice from '@/components/common/BackgroundQueryNotice/BackgroundQueryNotice';
import { useBackgroundQueryStore } from '@/store/backgroundQuery/backgroundQuery.store';
import { useDataStore } from '@/store/dataStore/data.store';
import type { ColumnType, DataTabType, RowType } from '@/types';
import { CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from '@/components/common/Columns/Columns';
import { DataContentStyled, DataLoadingStyled } from './Data.styled';
import StatusBar from './StatusBar/StatusBar';

const EMPTY_ROWS: RowType[] = [];
const EMPTY_COLUMNS: ColumnType[] = [];

export default function Data(): JSX.Element {
  const selectedTab = useSelectedTab<DataTabType>();
  const isGridLoading = useDataTabLoader();

  const [showColumns, setShowColumns] = useState(false);

  const rows = useDataStore((state) => state.rows ?? EMPTY_ROWS);
  const allColumns = useDataStore((state) => state.columns ?? EMPTY_COLUMNS);

  const waitingOnBackground = useBackgroundQueryStore((state) => (selectedTab ? !!state.byTab[selectedTab.id] : false));

  const activeColumns = useMemo(() => allColumns.filter((column) => column.isActive), [allColumns]);

  return (
    <>
      <ActionBar showColumns={showColumns} setShowColumns={setShowColumns} />
      <DataContentStyled>
        {showColumns && <Columns />}
        {waitingOnBackground && selectedTab ? (
          <BackgroundQueryNotice tabId={selectedTab.id} />
        ) : activeColumns.length > 0 ? (
          <DataGrid rows={rows} columns={activeColumns} loading={isGridLoading} editable={selectedTab?.editable} />
        ) : isGridLoading ? (
          <DataLoadingStyled>
            <CircularProgress size={30} />
          </DataLoadingStyled>
        ) : (
          <EmptyState icon='grid' title={locales.data_empty_title} description={locales.data_empty_description} />
        )}
      </DataContentStyled>
      <StatusBar />
    </>
  );
}
